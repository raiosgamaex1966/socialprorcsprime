import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Search, MessageCircle, Trash2, Users, Settings, Forward, X, Pin, PinOff, Pencil, Check, Image, Info, MoreVertical, BellOff, Archive, CheckCheck, MailOpen, Mail } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import VoiceRecorder from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import useNotificationSound from "@/hooks/useNotificationSound";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSidebarState } from "@/hooks/useSidebarState";
import MessageReactions from "@/components/MessageReactions";
import { ChatAttachmentButton, AttachmentPreview, MessageAttachment } from "@/components/ChatAttachment";
import type { PendingAttachment } from "@/components/ChatAttachment";
import CreateGroupChat from "@/components/CreateGroupChat";
import GroupChatSettings from "@/components/GroupChatSettings";
import ForwardMessage from "@/components/ForwardMessage";
import defaultAvatar from "@/assets/default-avatar.jpg";
import UserProfileCard from "@/components/UserProfileCard";
import GifPicker from "@/components/GifPicker";
import EmojiPicker from "@/components/EmojiPicker";

interface Conversation {
  id: string;
  participant_one: string | null;
  participant_two: string | null;
  is_group: boolean;
  group_name: string | null;
  group_avatar_url: string | null;
  created_by: string | null;
  updated_at: string;
  otherUser: { user_id: string; display_name: string | null; avatar_url: string | null } | null;
  members?: { user_id: string; display_name: string | null; avatar_url: string | null }[];
  lastMessage?: { content: string; created_at: string; sender_id: string } | null;
  unreadCount?: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { isCollapsed: collapsed } = useSidebarState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<{ content: string; attachment_url?: string | null; attachment_type?: string | null; attachment_name?: string | null } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const targetUserId = searchParams.get("userId");
  const targetConversationId = searchParams.get("conversation");
  const { isOnline } = useOnlinePresence();
  const { typingUserId, typingUserIds, sendTyping, sendStopTyping } = useTypingIndicator(activeConversation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playNotification } = useNotificationSound();

  // Fetch conversations
  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      // Fetch DM conversations
      const { data: dmConvs, error: dmErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("is_group", false)
        .or(`participant_one.eq.${user!.id},participant_two.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (dmErr) throw dmErr;

      // Fetch group conversations via membership
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);

      const groupConvIds = (memberships || []).map((m: any) => m.conversation_id);
      let groupConvs: any[] = [];
      if (groupConvIds.length > 0) {
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("is_group", true)
          .in("id", groupConvIds)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        groupConvs = data || [];
      }

      const allConvs = [...(dmConvs || []), ...groupConvs].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // DM profiles
      const otherUserIds = (dmConvs || []).map((c: any) =>
        c.participant_one === user!.id ? c.participant_two : c.participant_one
      ).filter(Boolean);

      // Group member profiles
      const allGroupMemberIds: string[] = [];
      if (groupConvIds.length > 0) {
        const { data: allMembers } = await supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", groupConvIds);
        (allMembers || []).forEach((m: any) => {
          if (!allGroupMemberIds.includes(m.user_id)) allGroupMemberIds.push(m.user_id);
        });
      }

      const allProfileIds = [...new Set([...otherUserIds, ...allGroupMemberIds])];
      const { data: profiles } = allProfileIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", allProfileIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Group members map
      const groupMembersMap = new Map<string, any[]>();
      if (groupConvIds.length > 0) {
        const { data: allMembers } = await supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", groupConvIds);
        (allMembers || []).forEach((m: any) => {
          if (!groupMembersMap.has(m.conversation_id)) groupMembersMap.set(m.conversation_id, []);
          groupMembersMap.get(m.conversation_id)!.push(profileMap.get(m.user_id) || { user_id: m.user_id, display_name: null, avatar_url: null });
        });
      }

      // Get last message and unread count
      const convIds = allConvs.map((c: any) => c.id);
      const { data: allMessages } = convIds.length > 0
        ? await supabase
            .from("messages")
            .select("conversation_id, content, created_at, sender_id, read")
            .in("conversation_id", convIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      const lastMessageMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();
      (allMessages || []).forEach((m: any) => {
        if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m);
        if (!m.read && m.sender_id !== user!.id) {
          unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
        }
      });

      return allConvs.map((c: any) => {
        const otherId = c.participant_one === user!.id ? c.participant_two : c.participant_one;
        return {
          ...c,
          otherUser: c.is_group ? null : (profileMap.get(otherId) || null),
          members: c.is_group ? (groupMembersMap.get(c.id) || []) : undefined,
          lastMessage: lastMessageMap.get(c.id) || null,
          unreadCount: unreadMap.get(c.id) || 0,
        } as Conversation;
      });
    },
    enabled: !!user,
  });

  // Handle deep-link to a user
  useEffect(() => {
    if (!targetUserId || !user || !conversations) return;
    const existing = conversations.find(
      (c) =>
        !c.is_group &&
        ((c.participant_one === user.id && c.participant_two === targetUserId) ||
         (c.participant_one === targetUserId && c.participant_two === user.id))
    );
    if (existing) {
      setActiveConversation(existing.id);
    } else {
      (async () => {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ participant_one: user.id, participant_two: targetUserId })
          .select()
          .single();
        if (error) { toast.error("Falha ao iniciar conversa"); return; }
        await refetchConversations();
        setActiveConversation(data.id);
      })();
    }
  }, [targetUserId, user, conversations]);

  // Handle deep-link to a conversation by ID
  useEffect(() => {
    if (!targetConversationId || !conversations) return;
    const existing = conversations.find((c) => c.id === targetConversationId);
    if (existing) {
      setActiveConversation(existing.id);
    }
  }, [targetConversationId, conversations]);

  // Fetch messages for active conversation
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", activeConversation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversation!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const unread = (data as any[]).filter((m: any) => !m.read && m.sender_id !== user!.id);
      if (unread.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unread.map((m: any) => m.id));
        refetchConversations();
      }

      const msgIds = (data as any[]).map((m: any) => m.id);
      const { data: reactions } = msgIds.length > 0
        ? await supabase.from("message_reactions").select("*").in("message_id", msgIds)
        : { data: [] };

      const reactionMap = new Map<string, any[]>();
      (reactions || []).forEach((r: any) => {
        if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, []);
        reactionMap.get(r.message_id)!.push(r);
      });

      // For group chats, fetch sender profiles and read receipts
      const activeConv = conversations?.find((c) => c.id === activeConversation);
      let senderProfileMap = new Map<string, any>();
      let readReceiptMap = new Map<string, any[]>();
      if (activeConv?.is_group) {
        const senderIds = [...new Set((data as any[]).map((m: any) => m.sender_id))];
        if (senderIds.length > 0) {
          const { data: senderProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", senderIds);
          (senderProfiles || []).forEach((p: any) => senderProfileMap.set(p.user_id, p));
        }

        // Fetch read receipts for all messages
        if (msgIds.length > 0) {
          const { data: receipts } = await supabase
            .from("message_read_receipts")
            .select("message_id, user_id, read_at")
            .in("message_id", msgIds);

          // Get profiles for receipt users not already fetched
          const receiptUserIds = [...new Set((receipts || []).map((r: any) => r.user_id))];
          const missingIds = receiptUserIds.filter((id) => !senderProfileMap.has(id));
          if (missingIds.length > 0) {
            const { data: extraProfiles } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url")
              .in("user_id", missingIds);
            (extraProfiles || []).forEach((p: any) => senderProfileMap.set(p.user_id, p));
          }

          (receipts || []).forEach((r: any) => {
            if (!readReceiptMap.has(r.message_id)) readReceiptMap.set(r.message_id, []);
            readReceiptMap.get(r.message_id)!.push({
              ...r,
              profile: senderProfileMap.get(r.user_id) || null,
            });
          });
        }

        // Record read receipts for messages sent by others
        const otherMsgIds = (data as any[])
          .filter((m: any) => m.sender_id !== user!.id)
          .map((m: any) => m.id);
        if (otherMsgIds.length > 0) {
          // Upsert read receipts (ignore conflicts)
          const receiptsToInsert = otherMsgIds.map((msgId: string) => ({
            message_id: msgId,
            user_id: user!.id,
          }));
          await supabase
            .from("message_read_receipts")
            .upsert(receiptsToInsert, { onConflict: "message_id,user_id", ignoreDuplicates: true });
        }
      }

      return (data as any[]).map((m: any) => ({
        ...m,
        reactions: reactionMap.get(m.id) || [],
        senderProfile: senderProfileMap.get(m.sender_id) || null,
        readReceipts: readReceiptMap.get(m.id) || [],
      }));
    },
    enabled: !!activeConversation && !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        if (payload.new && payload.new.sender_id !== user?.id) {
          playNotification();
        }
        refetchMessages(); refetchConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        refetchMessages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        refetchMessages();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_read_receipts" }, () => {
        refetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = useCallback(() => {
    sendTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendStopTyping(), 2000);
  }, [sendTyping, sendStopTyping]);

  const handleTogglePin = async (messageId: string, currentlyPinned: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          pinned: !currentlyPinned,
          pinned_by: !currentlyPinned ? user.id : null,
          pinned_at: !currentlyPinned ? new Date().toISOString() : null,
        })
        .eq("id", messageId);
      if (error) throw error;
      refetchMessages();
      toast.success(currentlyPinned ? "Mensagem desafixada" : "Mensagem fixada");
    } catch (err: any) {
      toast.error(err.message || "Falha ao atualizar fixação");
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !pendingAttachment) || !activeConversation || !user) return;
    setSending(true);
    sendStopTyping();
    try {
      let attachmentData: { url: string; type: string; name: string } | null = null;
      if (pendingAttachment) {
        setAttachmentUploading(true);
        const ext = pendingAttachment.file.name.split(".").pop() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(path, pendingAttachment.file, { contentType: pendingAttachment.file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        attachmentData = { url: urlData.publicUrl, type: pendingAttachment.type, name: pendingAttachment.file.name };
        setAttachmentUploading(false);
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: messageText.trim() || (attachmentData ? attachmentData.name : ""),
        attachment_url: attachmentData?.url || null,
        attachment_type: attachmentData?.type || null,
        attachment_name: attachmentData?.name || null,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversation);
      setMessageText("");
      setPendingAttachment(null);
      refetchMessages();
      refetchConversations();
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem");
      setAttachmentUploading(false);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceRecording = async (file: File) => {
    if (!activeConversation || !user) return;
    setSending(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: "🎤 Mensagem de voz",
        attachment_url: urlData.publicUrl,
        attachment_type: "audio",
        attachment_name: file.name,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversation);
      refetchMessages();
      refetchConversations();
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem de voz");
    } finally {
      setSending(false);
    }
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!activeConversation || !user) return;
    setShowGifPicker(false);
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: gifUrl,
        attachment_url: gifUrl,
        attachment_type: "image",
        attachment_name: "GIF",
      });
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConversation);
      refetchMessages();
      refetchConversations();
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar GIF");
    } finally {
      setSending(false);
    }
  };

  // Search for users to start a new DM
  const { data: searchResults } = useQuery({
    queryKey: ["user-search-chat", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .neq("user_id", user!.id)
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: showNewChat && searchQuery.length > 0 && !!user,
  });

  // Search messages across conversations
  const { data: messageSearchResults } = useQuery({
    queryKey: ["message-search", messageSearchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, conversation_id, sender_id, created_at")
        .ilike("content", `%${messageSearchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      // Get conversation names and sender profiles
      const convIds = [...new Set((data || []).map((m: any) => m.conversation_id))];
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];

      const [convRes, profileRes] = await Promise.all([
        convIds.length > 0
          ? supabase.from("conversations").select("id, group_name, is_group, participant_one, participant_two").in("id", convIds)
          : { data: [] },
        senderIds.length > 0
          ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", senderIds)
          : { data: [] },
      ]);

      const convMap = new Map((convRes.data || []).map((c: any) => [c.id, c]));
      const profileMap = new Map((profileRes.data || []).map((p: any) => [p.user_id, p]));

      // For DM conversations, get the other user's profile
      const dmOtherIds = (convRes.data || [])
        .filter((c: any) => !c.is_group)
        .map((c: any) => (c.participant_one === user!.id ? c.participant_two : c.participant_one))
        .filter((id: string) => id && !profileMap.has(id));
      if (dmOtherIds.length > 0) {
        const { data: otherProfiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", dmOtherIds);
        (otherProfiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
      }

      return (data || []).map((m: any) => {
        const conv = convMap.get(m.conversation_id);
        let convName = "Desconhecido";
        if (conv) {
          if (conv.is_group) {
            convName = conv.group_name || "Conversa em Grupo";
          } else {
            const otherId = conv.participant_one === user!.id ? conv.participant_two : conv.participant_one;
            convName = profileMap.get(otherId)?.display_name || "Usuário";
          }
        }
        return {
          ...m,
          convName,
          senderName: profileMap.get(m.sender_id)?.display_name || "Usuário",
          senderAvatar: profileMap.get(m.sender_id)?.avatar_url || null,
        };
      });
    },
    enabled: showMessageSearch && messageSearchQuery.length > 1 && !!user,
  });

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    const existing = conversations?.find(
      (c) =>
        !c.is_group &&
        ((c.participant_one === user.id && c.participant_two === otherUserId) ||
         (c.participant_one === otherUserId && c.participant_two === user.id))
    );
    if (existing) {
      setActiveConversation(existing.id);
      setShowNewChat(false);
      setSearchQuery("");
      return;
    }
    const { data, error } = await supabase
      .from("conversations")
      .insert({ participant_one: user.id, participant_two: otherUserId })
      .select()
      .single();
    if (error) { toast.error("Falha ao iniciar conversa"); return; }
    await refetchConversations();
    setActiveConversation(data.id);
    setShowNewChat(false);
    setSearchQuery("");
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageId) return;
    try {
      const { error } = await supabase.from("messages").delete().eq("id", deleteMessageId);
      if (error) throw error;
      refetchMessages();
      refetchConversations();
    } catch {
      toast.error("Falha ao excluir mensagem");
    } finally {
      setDeleteMessageId(null);
    }
  };

  const canEditMessage = (msg: any) => {
    return msg.sender_id === user?.id;
  };

  const startEditing = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: editingText.trim(), edited_at: new Date().toISOString() })
        .eq("id", editingMessageId);
      if (error) throw error;
      refetchMessages();
      cancelEditing();
    } catch {
      toast.error("Falha ao editar mensagem");
    }
  };

  const activeConv = conversations?.find((c) => c.id === activeConversation);

  const getConversationDisplayName = (conv: Conversation) => {
    if (conv.is_group) return conv.group_name || "Conversa em Grupo";
    return conv.otherUser?.display_name || "Usuário";
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.is_group) return conv.group_avatar_url || null;
    return conv.otherUser?.avatar_url || null;
  };

  const getConversationSubtext = (conv: Conversation) => {
    if (conv.is_group) {
      const count = conv.members?.length || 0;
      return `${count} ${count === 1 ? "membro" : "membros"}`;
    }
    if (conv.otherUser && isOnline(conv.otherUser.user_id)) return "Ativo(a) agora";
    return "Offline";
  };

  return (
    <>
    <main className="h-full flex w-full min-w-0 overflow-hidden bg-background">
        {/* Conversation list */}
        <div className={`w-full min-w-0 md:w-[360px] md:min-w-[360px] border-r border-border flex flex-col bg-card ${activeConversation ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 sm:p-4 border-b border-border">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-2xl font-bold text-foreground">Conversas</h2>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs sm:text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
                  title="Criar conversa em grupo"
                >
                  <Users className="w-4 h-4" />
                  Grupo
                </button>
                <button
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-90"
                >
                  Novo
                </button>
              </div>
            </div>

            {/* Message search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={messageSearchQuery}
                onChange={(e) => { setMessageSearchQuery(e.target.value); setShowMessageSearch(true); }}
                onFocus={() => setShowMessageSearch(true)}
                placeholder="Pesquisar mensagens..."
                className="w-full pl-10 pr-8 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {messageSearchQuery && (
                <button
                  onClick={() => { setMessageSearchQuery(""); setShowMessageSearch(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showNewChat && (
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar pessoas..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm"
                    autoFocus
                  />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-2 bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {searchResults.map((u: any) => (
                      <button
                        key={u.user_id}
                        onClick={() => startConversation(u.user_id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left"
                      >
                        <img src={u.avatar_url || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <span className="text-sm font-medium text-foreground">{u.display_name || "Usuário"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Message search results */}
            {showMessageSearch && messageSearchQuery.length > 1 && (
              <div>
                {messageSearchResults?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem encontrada</p>
                )}
                {messageSearchResults?.map((result: any) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setActiveConversation(result.conversation_id);
                      setShowMessageSearch(false);
                      setMessageSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left border-b border-border"
                  >
                    <img src={result.senderAvatar || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground truncate">{result.convName}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(result.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{result.senderName}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Normal conversation list (hidden during search) */}
            {(!showMessageSearch || messageSearchQuery.length <= 1) && (
              <>
            {conversations?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma conversa ainda</p>
                <p className="text-xs mt-1">Clique em "Novo" ou "Grupo" para começar a conversar</p>
              </div>
            )}
            {conversations?.map((conv) => (
              <div
                key={conv.id}
                className={`group/chat relative w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left cursor-pointer ${
                  activeConversation === conv.id ? "bg-secondary" : ""
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <div className="relative">
                  {conv.is_group ? (
                    conv.group_avatar_url ? (
                      <img src={conv.group_avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    )
                  ) : (
                    <>
                      <img src={getConversationAvatar(conv) || defaultAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                      {conv.otherUser && isOnline(conv.otherUser.user_id) && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[15px] font-semibold text-foreground truncate">
                      {getConversationDisplayName(conv)}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false, locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] text-muted-foreground truncate flex-1">
                      {conv.lastMessage
                        ? `${conv.lastMessage.sender_id === user?.id ? "Você: " : ""}${conv.lastMessage.content}`
                        : "Iniciar uma conversa"}
                    </p>
                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="opacity-0 group-hover/chat:opacity-100 transition-opacity w-7 h-7 rounded-full bg-secondary hover:bg-muted flex items-center justify-center shrink-0">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {(conv.unreadCount ?? 0) > 0 ? (
                      <DropdownMenuItem onClick={() => {
                        if (user) {
                          supabase
                            .from("messages")
                            .update({ read: true })
                            .eq("conversation_id", conv.id)
                            .neq("sender_id", user.id)
                            .eq("read", false)
                            .then(() => refetchConversations());
                          toast.success("Marcado como lido");
                        }
                      }}>
                        <MailOpen className="w-4 h-4 mr-2" />
                        Marcar como lida
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => {
                        if (user) {
                          supabase
                            .from("messages")
                            .update({ read: false })
                            .eq("conversation_id", conv.id)
                            .neq("sender_id", user.id)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .then(() => refetchConversations());
                          toast.success("Marcado como não lido");
                        }
                      }}>
                        <Mail className="w-4 h-4 mr-2" />
                        Marcar como não lida
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => {
                      toast.info("Conversa fixada");
                    }}>
                      <Pin className="w-4 h-4 mr-2" />
                      Fixar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.info("Conversa silenciada");
                    }}>
                      <BellOff className="w-4 h-4 mr-2" />
                      Silenciar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.info("Conversa arquivada");
                    }}>
                      <Archive className="w-4 h-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={async () => {
                        if (!user) return;
                        const { error } = await supabase
                          .from("conversations")
                          .delete()
                          .eq("id", conv.id);
                        if (error) {
                          toast.error("Falha ao excluir conversa");
                        } else {
                          toast.success("Conversa excluída");
                          if (activeConversation === conv.id) setActiveConversation(null);
                          refetchConversations();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            </>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!activeConversation ? "hidden md:flex" : "flex"}`}>
          {activeConversation && activeConv ? (
            <div className="relative flex-1 flex h-full min-w-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
              {/* Chat header */}
              <div className="flex items-center gap-2 p-2.5 sm:p-4 border-b border-border bg-card min-w-0">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => {
                    if (activeConv.is_group) {
                      setShowGroupSettings(!showGroupSettings);
                    } else if (activeConv.otherUser) {
                      navigate(`/profile/${activeConv.otherUser.user_id}`);
                    }
                  }}
                  className="relative hover:opacity-80 transition-opacity shrink-0"
                >
                  {activeConv.is_group ? (
                    activeConv.group_avatar_url ? (
                      <img src={activeConv.group_avatar_url} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    )
                  ) : (
                    <>
                      <img src={getConversationAvatar(activeConv) || defaultAvatar} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                      {activeConv.otherUser && isOnline(activeConv.otherUser.user_id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (activeConv.is_group) {
                      setShowGroupSettings(!showGroupSettings);
                    } else if (activeConv.otherUser) {
                      navigate(`/profile/${activeConv.otherUser.user_id}`);
                    }
                  }}
                  className="flex-1 min-w-0 overflow-hidden text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-[15px] font-semibold text-foreground truncate">
                    {getConversationDisplayName(activeConv)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{getConversationSubtext(activeConv)}</p>
                </button>
                {activeConv.is_group && (
                  <button
                    onClick={() => setShowGroupSettings(!showGroupSettings)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      showGroupSettings ? "bg-primary/10 text-primary" : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                    title="Group info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Pinned messages banner */}
              {(() => {
                const pinnedMsgs = messages?.filter((m: any) => m.pinned) || [];
                if (pinnedMsgs.length === 0) return null;
                return (
                  <div className="mx-4 mt-2 mb-1 p-2.5 rounded-lg bg-accent/50 border border-border">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                      <Pin className="w-3.5 h-3.5 text-primary" />
                      {pinnedMsgs.length} {pinnedMsgs.length !== 1 ? "mensagens fixadas" : "mensagem fixada"}
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {pinnedMsgs.map((pm: any) => (
                        <p key={pm.id} className="text-xs text-muted-foreground truncate">
                          <span className="font-medium text-foreground">
                            {pm.sender_id === user?.id ? "Você" : (pm.senderProfile?.display_name || "Usuário")}:
                          </span>{" "}
                          {pm.content}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {messages?.map((msg: any) => {
                  const isMine = msg.sender_id === user?.id;
                  const emojiMap = new Map<string, { count: number; reacted: boolean }>();
                  (msg.reactions || []).forEach((r: any) => {
                    const existing = emojiMap.get(r.emoji) || { count: 0, reacted: false };
                    existing.count++;
                    if (r.user_id === user?.id) existing.reacted = true;
                    emojiMap.set(r.emoji, existing);
                  });
                  const aggregated = Array.from(emojiMap.entries()).map(([emoji, data]) => ({ emoji, ...data }));

                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
                      {/* Message actions dropdown */}
                      {isMine && (
                        <div className="self-center mr-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[160px]">
                              <DropdownMenuItem onClick={() => handleTogglePin(msg.id, msg.pinned)}>
                                {msg.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                                {msg.pinned ? "Desafixar" : "Fixar"}
                              </DropdownMenuItem>
                              {canEditMessage(msg) && (
                                <DropdownMenuItem onClick={() => startEditing(msg)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setForwardMessage({ content: msg.content, attachment_url: msg.attachment_url, attachment_type: msg.attachment_type, attachment_name: msg.attachment_name })}>
                                <Forward className="w-4 h-4 mr-2" /> Encaminhar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteMessageId(msg.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {!isMine && (
                        <div className="self-center ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity order-last">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[160px]">
                              <DropdownMenuItem onClick={() => handleTogglePin(msg.id, msg.pinned)}>
                                {msg.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                                {msg.pinned ? "Desafixar" : "Fixar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setForwardMessage({ content: msg.content, attachment_url: msg.attachment_url, attachment_type: msg.attachment_type, attachment_name: msg.attachment_name })}>
                                <Forward className="w-4 h-4 mr-2" /> Encaminhar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {/* Group chat: show sender avatar */}
                      {!isMine && activeConv.is_group && (
                        <img
                          src={msg.senderProfile?.avatar_url || defaultAvatar}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover self-end mr-2 mb-1"
                        />
                      )}
                      <div className="max-w-[82%] sm:max-w-[70%]">
                        {/* Group chat: show sender name */}
                        {!isMine && activeConv.is_group && (
                          <UserProfileCard userId={msg.sender_id}>
                            <p className="text-xs text-muted-foreground mb-0.5 ml-1 hover:underline cursor-pointer inline-block">
                              {msg.senderProfile?.display_name || "Usuário"}
                            </p>
                          </UserProfileCard>
                        )}
                        {msg.pinned && (
                          <div className="flex items-center gap-1 mb-1 ml-1">
                            <Pin className="w-3 h-3 text-primary" />
                            <span className="text-[10px] text-muted-foreground font-medium">Fixado</span>
                          </div>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.attachment_url && (
                            <MessageAttachment
                              url={msg.attachment_url}
                              type={msg.attachment_type || "file"}
                              name={msg.attachment_name || "Attachment"}
                            />
                          )}
                          {editingMessageId === msg.id ? (
                            <div className="flex flex-col gap-1.5">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-background/20 text-inherit rounded-md px-2 py-1 text-[15px] outline-none resize-none min-h-[40px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                  if (e.key === "Escape") cancelEditing();
                                }}
                              />
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={cancelEditing} className="text-[11px] px-2 py-0.5 rounded hover:bg-background/20 transition-colors">Cancelar</button>
                                <button onClick={saveEdit} className="text-[11px] px-2 py-0.5 rounded bg-background/20 hover:bg-background/30 transition-colors flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.content && !(msg.attachment_url && msg.content === msg.attachment_name) && (
                                <p className="text-[15px] whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                                {msg.edited_at && (
                                  <span className={`text-[10px] italic ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>editado</span>
                                )}
                                <span className={`text-[11px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                                {isMine && (
                                  <span className={`text-[11px] font-medium ${msg.read ? "text-primary-foreground" : "text-primary-foreground/50"}`}>
                                    {msg.read ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {(aggregated.length > 0 || true) && (
                          <div className="mt-1">
                            <MessageReactions
                              messageId={msg.id}
                              reactions={aggregated}
                              isMine={isMine}
                              onReactionChange={refetchMessages}
                            />
                          </div>
                        )}
                        {/* Group read receipts */}
                        {isMine && activeConv.is_group && msg.readReceipts && msg.readReceipts.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-1 justify-end" title={msg.readReceipts.map((r: any) => r.profile?.display_name || "Usuário").join(", ")}>
                            <span className="text-[10px] text-muted-foreground mr-1">Visualizado por</span>
                            {msg.readReceipts.slice(0, 5).map((r: any) => (
                              <img
                                key={r.user_id}
                                src={r.profile?.avatar_url || defaultAvatar}
                                alt={r.profile?.display_name || "Usuário"}
                                title={r.profile?.display_name || "Usuário"}
                                className="w-4 h-4 rounded-full object-cover border border-background -ml-1 first:ml-0"
                              />
                            ))}
                            {msg.readReceipts.length > 5 && (
                              <span className="text-[10px] text-muted-foreground ml-1">+{msg.readReceipts.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {typingUserIds.length > 0 && (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </span>
                    {activeConv?.is_group
                      ? (() => {
                          const names = typingUserIds
                            .map((uid) => activeConv.members?.find((m: any) => m.user_id === uid)?.display_name)
                            .filter(Boolean);
                          if (names.length === 0) return "Alguém está digitando...";
                          if (names.length === 1) return `${names[0]} está digitando...`;
                          if (names.length === 2) return `${names[0]} e ${names[1]} estão digitando...`;
                          return `${names[0]} e outros ${names.length - 1} estão digitando...`;
                        })()
                      : `${activeConv?.otherUser?.display_name || "Usuário"} está digitando...`}
                  </span>
                </div>
              )}

              {/* Attachment preview */}
              {pendingAttachment && (
                <AttachmentPreview pending={pendingAttachment} onRemove={() => setPendingAttachment(null)} />
              )}

              {/* Input */}
              <div className="p-2.5 sm:p-4 border-t border-border bg-card">
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <ChatAttachmentButton
                    onAttachmentReady={() => {}}
                    pending={pendingAttachment}
                    setPending={setPendingAttachment}
                    uploading={attachmentUploading}
                    setUploading={setAttachmentUploading}
                  />
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Enviar um GIF"
                    >
                      <span className="text-xs font-bold">GIF</span>
                    </button>
                    {showGifPicker && (
                      <GifPicker
                        onSelect={handleGifSelect}
                        onClose={() => setShowGifPicker(false)}
                      />
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Emoji"
                    >
                      <span className="text-lg">😊</span>
                    </button>
                    {showEmojiPicker && (
                      <EmojiPicker
                        onSelect={(emoji) => { setMessageText((prev) => prev + emoji); setShowEmojiPicker(false); }}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Aa"
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
                  />
                  {messageText.trim() || pendingAttachment ? (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  ) : (
                    <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={sending} />
                  )}
                </div>
              </div>
              </div>

              {/* Inline group info panel */}
              {activeConv.is_group && showGroupSettings && (
                <GroupChatSettings
                  open={showGroupSettings}
                  onClose={() => setShowGroupSettings(false)}
                  conversationId={activeConversation!}
                  groupName={activeConv.group_name || "Conversa em Grupo"}
                  groupAvatarUrl={activeConv.group_avatar_url || null}
                  onUpdate={refetchConversations}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecione uma conversa</p>
                <p className="text-sm mt-1">Escolha uma de suas conversas existentes ou inicie uma nova</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete message dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente esta mensagem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create group dialog */}
      <CreateGroupChat
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(id) => {
          setActiveConversation(id);
          refetchConversations();
        }}
      />

      {/* Forward message dialog */}
      <ForwardMessage
        open={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        message={forwardMessage}
      />
    </>
  );
};

export default Messages;
