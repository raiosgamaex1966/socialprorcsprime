import { X, CheckCircle, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Attendee {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  status: string;
}

interface AttendeeListModalProps {
  going: Attendee[];
  interested: Attendee[];
  onClose: () => void;
}

const AttendeeRow = ({ person }: { person: Attendee }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 rounded-lg transition-colors">
    <Avatar className="w-9 h-9">
      <AvatarImage src={person.avatar_url || ""} />
      <AvatarFallback className="text-xs bg-primary/10 text-primary">
        {(person.display_name || "?")[0]}
      </AvatarFallback>
    </Avatar>
    <span className="text-sm font-medium text-foreground truncate">
      {person.display_name || "Desconhecido"}
    </span>
  </div>
);

const AttendeeListModal = ({ going, interested, onClose }: AttendeeListModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-[400px] shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Participantes</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <Tabs defaultValue="going" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 pt-1">
            <TabsTrigger value="going" className="text-xs gap-1.5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <CheckCircle className="w-3.5 h-3.5" /> Confirmados ({going.length})
            </TabsTrigger>
            <TabsTrigger value="interested" className="text-xs gap-1.5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Star className="w-3.5 h-3.5" /> Interessados ({interested.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="going" className="flex-1 overflow-y-auto p-2 mt-0">
            {going.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Ninguém confirmado ainda</p>
            ) : (
              going.map((p) => <AttendeeRow key={p.user_id} person={p} />)
            )}
          </TabsContent>

          <TabsContent value="interested" className="flex-1 overflow-y-auto p-2 mt-0">
            {interested.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Ninguém interessado ainda</p>
            ) : (
              interested.map((p) => <AttendeeRow key={p.user_id} person={p} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AttendeeListModal;
