import { useState, useEffect, useCallback } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Settings, Globe2, Shield, Users, Bell, Code, Eye, Lock,
  Languages, Calendar, Home, UserPlus, Key, AlertTriangle, Save,
  Map, Video, Smartphone, MonitorSmartphone, Upload, HardDrive,
  Cloud, Server, FileVideo, Music, Image, Bug, Database,
  Mail, MessageSquare, Phone, Send, TestTube, Bot, CreditCard,
  Sparkles, Palette, ShoppingBag, Megaphone, Tag, LayoutGrid,
  Store, BarChart3, Layers, Plus, X, Trash2, DollarSign, Wallet,
  Crown, Banknote, Bitcoin,
} from "lucide-react";
import { toast } from "sonner";

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

const SettingToggle = ({ label, description, checked, onCheckedChange }: SettingToggleProps) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div className="space-y-0.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0 mt-0.5" />
  </div>
);

interface SectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const SettingsSection = ({ title, description, icon: Icon, children }: SectionProps) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4.5 h-4.5 text-primary" />
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      {description && <CardDescription className="text-xs">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-1">
      {children}
    </CardContent>
  </Card>
);

const AdminSettings = ({ onNavigateToDesign }: { onNavigateToDesign?: () => void }) => {
  const { settings: savedSettings, loading: settingsLoading, saving, saveSettings } = useSiteSettings("admin_settings");
  // General Configuration
  const [developerMode, setDeveloperMode] = useState(false);
  const [cacheSystem, setCacheSystem] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [seoFriendlyUrl, setSeoFriendlyUrl] = useState(true);
  const [developersApi, setDevelopersApi] = useState(false);
  const [welcomePageUsers, setWelcomePageUsers] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState("english");
  const [dateFormat, setDateFormat] = useState("yyyy-mm-dd");
  const [landingPage, setLandingPage] = useState("login");

  // User Configuration
  const [onlineUsers, setOnlineUsers] = useState(true);
  const [lastSeenStatus, setLastSeenStatus] = useState(true);
  const [accountDeletion, setAccountDeletion] = useState(true);
  const [profileBgChange, setProfileBgChange] = useState("all");
  const [friendsSystem, setFriendsSystem] = useState("friend");
  const [connectivityLimit, setConnectivityLimit] = useState("500");
  const [userInviteSystem, setUserInviteSystem] = useState(true);
  const [inviteLinksLimit, setInviteLinksLimit] = useState("5");
  const [inviteLinksPeriod, setInviteLinksPeriod] = useState("1day");

  // Other Settings
  const [censoredWords, setCensoredWords] = useState("");
  const [homePageCaching, setHomePageCaching] = useState("2min");
  const [profilePageCaching, setProfilePageCaching] = useState("2min");
  const [exchangerateApiKey, setExchangerateApiKey] = useState("");

  // Login & Registration
  const [userRegistration, setUserRegistration] = useState(true);
  const [autoUsername, setAutoUsername] = useState(true);
  const [passwordComplexity, setPasswordComplexity] = useState(true);
  const [unusualLogin, setUnusualLogin] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState("email");
  const [googleAuth, setGoogleAuth] = useState(false);
  const [authySettings, setAuthySettings] = useState(false);
  const [authyToken, setAuthyToken] = useState("");
  const [accountValidation, setAccountValidation] = useState(true);
  const [validationMethod, setValidationMethod] = useState("email");
  const [recaptcha, setRecaptcha] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState("");
  const [recaptchaSecret, setRecaptchaSecret] = useState("");
  const [preventBadLogin, setPreventBadLogin] = useState(true);
  const [loginLimit, setLoginLimit] = useState("5");
  const [lockoutTime, setLockoutTime] = useState("15");
  const [registrationLimit, setRegistrationLimit] = useState("3");
  const [reservedUsernames, setReservedUsernames] = useState(true);
  const [reservedUsernamesList, setReservedUsernamesList] = useState("admin, moderator, support, help");
  const [disableStartPage, setDisableStartPage] = useState(false);

  // Notifications Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profileVisitNotifications, setProfileVisitNotifications] = useState(false);
  const [newPostNotification, setNewPostNotification] = useState(true);

  // Website Information
  const [websiteTitle, setWebsiteTitle] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [websiteKeywords, setWebsiteKeywords] = useState("");
  const [websiteDescription, setWebsiteDescription] = useState("");
  const [googleAnalyticsCode, setGoogleAnalyticsCode] = useState("");

  // Features API Keys
  const [googleMaps, setGoogleMaps] = useState(false);
  const [googleMapApi, setGoogleMapApi] = useState("");
  const [yandexMaps, setYandexMaps] = useState(false);
  const [yandexMapApi, setYandexMapApi] = useState("");
  const [yandexTranslation, setYandexTranslation] = useState(false);
  const [yandexTranslationApi, setYandexTranslationApi] = useState("");
  const [googleTranslation, setGoogleTranslation] = useState(false);
  const [googleTranslationApi, setGoogleTranslationApi] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [giphyApi, setGiphyApi] = useState("");

  // File Upload Configuration
  const [fileUpload, setFileUpload] = useState(true);
  const [videoUpload, setVideoUpload] = useState(true);
  const [reelsUpload, setReelsUpload] = useState(true);
  const [audioUpload, setAudioUpload] = useState(true);
  const [cssUpload, setCssUpload] = useState(false);
  const [allowedExtensions, setAllowedExtensions] = useState("jpg, png, gif, jpeg, webp, svg, bmp, ico, mp4, mov, avi, mp3, wav, ogg, pdf, doc, docx, zip");
  const [allowedMimeTypes, setAllowedMimeTypes] = useState("image/jpeg, image/png, image/gif, image/webp, video/mp4, audio/mpeg, application/pdf");
  const [maxUploadSize, setMaxUploadSize] = useState("48mb");
  const [imageCompression, setImageCompression] = useState("medium");
  const [ffmpegSystem, setFfmpegSystem] = useState(false);
  const [ffmpegPath, setFfmpegPath] = useState("/usr/bin/ffmpeg");
  const [ffmpegSpeed, setFfmpegSpeed] = useState("medium");
  const [ffmpegExtensions, setFfmpegExtensions] = useState("mp4, mov, avi, wmv, flv, mkv, webm, 3gp");
  const [ffmpegMimeTypes, setFfmpegMimeTypes] = useState("video/mp4, video/quicktime, video/x-msvideo, video/webm");
  // Storage & CDN
  const [amazonS3, setAmazonS3] = useState(false);
  const [s3BucketName, setS3BucketName] = useState("");
  const [s3Key, setS3Key] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [s3Region, setS3Region] = useState("us-east-1");
  const [digitalocean, setDigitalocean] = useState(false);
  const [doSpaceName, setDoSpaceName] = useState("");
  const [doKey, setDoKey] = useState("");
  const [doSecret, setDoSecret] = useState("");
  const [doEndpoint, setDoEndpoint] = useState("");
  const [doRegion, setDoRegion] = useState("nyc1");
  const [wasabi, setWasabi] = useState(false);
  const [wasabiBucket, setWasabiBucket] = useState("");
  const [wasabiAccessKey, setWasabiAccessKey] = useState("");
  const [wasabiSecretKey, setWasabiSecretKey] = useState("");
  const [wasabiEndpoint, setWasabiEndpoint] = useState("");
  const [wasabiRegion, setWasabiRegion] = useState("us-east-1");
  const [ftpStorage, setFtpStorage] = useState(false);
  const [ftpHostname, setFtpHostname] = useState("");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpPath, setFtpPath] = useState("");
  const [ftpEndpoint, setFtpEndpoint] = useState("");
  const [googleCloud, setGoogleCloud] = useState(false);
  const [gcBucketName, setGcBucketName] = useState("");
  const [gcFilePath, setGcFilePath] = useState("");
  const [gcEndpoint, setGcEndpoint] = useState("");
  const [backblaze, setBackblaze] = useState(false);
  const [bbBucketId, setBbBucketId] = useState("");
  const [bbBucketName, setBbBucketName] = useState("");
  const [bbBucketRegion, setBbBucketRegion] = useState("");
  const [bbAccessKeyId, setBbAccessKeyId] = useState("");
  const [bbAccessKey, setBbAccessKey] = useState("");
  const [bbEndpoint, setBbEndpoint] = useState("");

  // Email & SMS Configuration
  const [emailServer, setEmailServer] = useState("servermail");
  const [defaultEmail, setDefaultEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpEncryption, setSmtpEncryption] = useState("ssl");
  const [defaultSmsProvider, setDefaultSmsProvider] = useState("twilio");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [bulkSmsUsername, setBulkSmsUsername] = useState("");
  const [bulkSmsPassword, setBulkSmsPassword] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [infobipApiKey, setInfobipApiKey] = useState("");
  const [infobipBaseUrl, setInfobipBaseUrl] = useState("");
  const [msg91AuthKey, setMsg91AuthKey] = useState("");
  const [msg91DltId, setMsg91DltId] = useState("");
  const [emailDebugLog, setEmailDebugLog] = useState("");

  // AI Settings
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4");
  const [aiImages, setAiImages] = useState(true);
  const [aiImagesApi, setAiImagesApi] = useState("openai");
  const [aiPosts, setAiPosts] = useState(true);
  const [aiPostsApi, setAiPostsApi] = useState("openai");
  const [aiBlog, setAiBlog] = useState(true);
  const [aiBlogApi, setAiBlogApi] = useState("openai");
  const [aiAvatarCover, setAiAvatarCover] = useState(false);
  const [aiAvatarApi, setAiAvatarApi] = useState("replicate");
  const [replicateModel, setReplicateModel] = useState("stability-ai/stable-diffusion");
  const [replicateApiToken, setReplicateApiToken] = useState("");
  const [replicateInferenceSteps, setReplicateInferenceSteps] = useState("50");
  const [replicateGuidanceScale, setReplicateGuidanceScale] = useState("7");
  const [replicateSeed, setReplicateSeed] = useState("");
  const [creditPrice, setCreditPrice] = useState("1");
  const [aiImagesCreditSystem, setAiImagesCreditSystem] = useState(true);
  const [generatedImagePrice, setGeneratedImagePrice] = useState("5");
  const [aiTextCreditSystem, setAiTextCreditSystem] = useState(true);
  const [generatedWordPrice, setGeneratedWordPrice] = useState("1");

  // Payment Configuration
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [paymentGateway, setPaymentGateway] = useState("stripe");
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalMode, setPaypalMode] = useState("sandbox");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalClientSecret, setPaypalClientSecret] = useState("");
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [coinbaseEnabled, setCoinbaseEnabled] = useState(false);
  const [coinbaseApiKey, setCoinbaseApiKey] = useState("");
  const [coinbaseWebhookSecret, setCoinbaseWebhookSecret] = useState("");
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [bankTransferInstructions, setBankTransferInstructions] = useState("");
  const [proSystem, setProSystem] = useState(false);
  const [proMonthlyPrice, setProMonthlyPrice] = useState("9.99");
  const [proYearlyPrice, setProYearlyPrice] = useState("99.99");
  const [proLifetimePrice, setProLifetimePrice] = useState("299.99");
  const [walletSystem, setWalletSystem] = useState(false);
  const [walletMinTopup, setWalletMinTopup] = useState("5");
  const [walletMaxTopup, setWalletMaxTopup] = useState("500");

  // Manage Features
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [marketplaceVerifiedSellers, setMarketplaceVerifiedSellers] = useState(true);
  const [marketplaceFraudDetection, setMarketplaceFraudDetection] = useState(true);
  const [marketplaceOffers, setMarketplaceOffers] = useState(true);
  const [marketplacePriceHistory, setMarketplacePriceHistory] = useState(true);
  const [marketplaceMaxImages, setMarketplaceMaxImages] = useState("10");
  const [marketplaceMaxPrice, setMarketplaceMaxPrice] = useState("100000");
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [adsBanner, setAdsBanner] = useState(true);
  const [adsInterstitial, setAdsInterstitial] = useState(true);
  const [adsInterstitialFrequency, setAdsInterstitialFrequency] = useState("5");
  const [adsInterstitialCooldown, setAdsInterstitialCooldown] = useState("5");
  const [adsSponsoredPosts, setAdsSponsoredPosts] = useState(true);
  const [adsSidebarCards, setAdsSidebarCards] = useState(true);
  const [adsAutoApprove, setAdsAutoApprove] = useState(false);
  const [adsMinBudget, setAdsMinBudget] = useState("5");
  const [adsCostPerImpression, setAdsCostPerImpression] = useState("0.01");
  const [adsCostPerClick, setAdsCostPerClick] = useState("0.10");
  const [adsMaxPerPage, setAdsMaxPerPage] = useState("3");
  const [adsUserCreateEnabled, setAdsUserCreateEnabled] = useState(true);
  const [adsTargetingAge, setAdsTargetingAge] = useState(true);
  const [adsTargetingGender, setAdsTargetingGender] = useState(true);
  const [adsTargetingLocation, setAdsTargetingLocation] = useState(true);
  const [adsTargetingInterests, setAdsTargetingInterests] = useState(true);
  const [adsGoogleAdsense, setAdsGoogleAdsense] = useState(false);
  const [adsensePublisherId, setAdsensePublisherId] = useState("");
  const [adsenseHeaderSlot, setAdsenseHeaderSlot] = useState("");
  const [adsenseSidebarSlot, setAdsenseSidebarSlot] = useState("");
  const [adsenseFeedSlot, setAdsenseFeedSlot] = useState("");
  const [adsNsfwFilter, setAdsNsfwFilter] = useState(true);
  const [adsMaxDuration, setAdsMaxDuration] = useState("30");
  const [adsRevenueShare, setAdsRevenueShare] = useState("70");
  // Categories
  const [marketplaceCategories, setMarketplaceCategories] = useState([
    "Electronics", "Vehicles", "Furniture", "Clothing", "Sports", "Books", "Home & Garden", "Toys", "Music", "Other"
  ]);
  const [groupCategories, setGroupCategories] = useState([
    "General", "Sports", "Technology", "Music", "Art & Design", "Gaming", "Education", "Business", "Health & Fitness", "Food & Cooking", "Travel", "Science", "Books & Reading", "Movies & TV", "Photography"
  ]);
  const [pageCategories, setPageCategories] = useState([
    "Business", "Restaurant / Café", "Shopping & Retail", "Creator / Public Figure", "Musician / Band", "Artist", "Community Organization", "Nonprofit", "Sports Team", "Entertainment", "Education", "Health & Wellness", "Technology", "Media / News", "Other"
  ]);
  const [eventCategories, setEventCategories] = useState([
    "General", "Social", "Meetup", "Workshop", "Webinar", "Sports", "Music", "Fundraiser", "Networking", "Celebration"
  ]);
  const [newCategory, setNewCategory] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("marketplace");

  // Android & iOS Apps
  const [androidMessenger, setAndroidMessenger] = useState("");
  const [androidTimeline, setAndroidTimeline] = useState("");
  const [iosMessenger, setIosMessenger] = useState("");
  const [iosTimeline, setIosTimeline] = useState("");
  const [windowsMessenger, setWindowsMessenger] = useState("");

  // PWA Settings
  const [pwaEnabled, setPwaEnabled] = useState(true);
  const [pwaAppName, setPwaAppName] = useState("");
  const [pwaShortName, setPwaShortName] = useState("");
  const [pwaThemeColor, setPwaThemeColor] = useState("#1d4ed8");
  const [pwaBackgroundColor, setPwaBackgroundColor] = useState("#ffffff");
  const [pwaOfflineMode, setPwaOfflineMode] = useState(true);
  const [pwaPushNotifications, setPwaPushNotifications] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(true);

  // Load saved settings into local state
  useEffect(() => {
    if (!settingsLoading && savedSettings && Object.keys(savedSettings).length > 0) {
      const s = savedSettings;
      if (s.developerMode !== undefined) setDeveloperMode(s.developerMode);
      if (s.cacheSystem !== undefined) setCacheSystem(s.cacheSystem);
      if (s.maintenanceMode !== undefined) setMaintenanceMode(s.maintenanceMode);
      if (s.seoFriendlyUrl !== undefined) setSeoFriendlyUrl(s.seoFriendlyUrl);
      if (s.developersApi !== undefined) setDevelopersApi(s.developersApi);
      if (s.welcomePageUsers !== undefined) setWelcomePageUsers(s.welcomePageUsers);
      if (s.defaultLanguage !== undefined) setDefaultLanguage(s.defaultLanguage);
      if (s.dateFormat !== undefined) setDateFormat(s.dateFormat);
      if (s.landingPage !== undefined) setLandingPage(s.landingPage);
      if (s.onlineUsers !== undefined) setOnlineUsers(s.onlineUsers);
      if (s.lastSeenStatus !== undefined) setLastSeenStatus(s.lastSeenStatus);
      if (s.accountDeletion !== undefined) setAccountDeletion(s.accountDeletion);
      if (s.profileBgChange !== undefined) setProfileBgChange(s.profileBgChange);
      if (s.friendsSystem !== undefined) setFriendsSystem(s.friendsSystem);
      if (s.connectivityLimit !== undefined) setConnectivityLimit(s.connectivityLimit);
      if (s.userInviteSystem !== undefined) setUserInviteSystem(s.userInviteSystem);
      if (s.censoredWords !== undefined) setCensoredWords(s.censoredWords);
      if (s.websiteTitle !== undefined) setWebsiteTitle(s.websiteTitle);
      if (s.websiteName !== undefined) setWebsiteName(s.websiteName);
      if (s.websiteKeywords !== undefined) setWebsiteKeywords(s.websiteKeywords);
      if (s.websiteDescription !== undefined) setWebsiteDescription(s.websiteDescription);
      if (s.googleAnalyticsCode !== undefined) setGoogleAnalyticsCode(s.googleAnalyticsCode);
      if (s.userRegistration !== undefined) setUserRegistration(s.userRegistration);
      if (s.twoFactorAuth !== undefined) setTwoFactorAuth(s.twoFactorAuth);
      if (s.preventBadLogin !== undefined) setPreventBadLogin(s.preventBadLogin);
      if (s.loginLimit !== undefined) setLoginLimit(s.loginLimit);
      if (s.lockoutTime !== undefined) setLockoutTime(s.lockoutTime);
      if (s.marketplaceEnabled !== undefined) setMarketplaceEnabled(s.marketplaceEnabled);
      if (s.adsEnabled !== undefined) setAdsEnabled(s.adsEnabled);
      if (s.paymentEnabled !== undefined) setPaymentEnabled(s.paymentEnabled);
      if (s.paymentCurrency !== undefined) setPaymentCurrency(s.paymentCurrency);
      if (s.proSystem !== undefined) setProSystem(s.proSystem);
      if (s.walletSystem !== undefined) setWalletSystem(s.walletSystem);
      if (s.marketplaceCategories !== undefined) setMarketplaceCategories(s.marketplaceCategories);
      if (s.groupCategories !== undefined) setGroupCategories(s.groupCategories);
      if (s.pageCategories !== undefined) setPageCategories(s.pageCategories);
      if (s.eventCategories !== undefined) setEventCategories(s.eventCategories);
    }
  }, [settingsLoading, savedSettings]);

  const handleSave = async () => {
    await saveSettings({
      developerMode, cacheSystem, maintenanceMode, seoFriendlyUrl, developersApi,
      welcomePageUsers, defaultLanguage, dateFormat, landingPage,
      onlineUsers, lastSeenStatus, accountDeletion, profileBgChange, friendsSystem,
      connectivityLimit, userInviteSystem, censoredWords,
      websiteTitle, websiteName, websiteKeywords, websiteDescription, googleAnalyticsCode,
      userRegistration, twoFactorAuth, preventBadLogin, loginLimit, lockoutTime,
      marketplaceEnabled, adsEnabled, paymentEnabled, paymentCurrency,
      proSystem, walletSystem,
      marketplaceCategories, groupCategories, pageCategories, eventCategories,
    });
  };

  const languages = [
    { value: "arabic", label: "Árabe" },
    { value: "bengali", label: "Bengali" },
    { value: "chinese", label: "Chinês" },
    { value: "croatian", label: "Croata" },
    { value: "danish", label: "Dinamarquês" },
    { value: "dutch", label: "Holandês" },
    { value: "english", label: "Inglês" },
    { value: "filipino", label: "Filipino" },
    { value: "french", label: "Francês" },
    { value: "german", label: "Alemão" },
    { value: "hebrew", label: "Hebraico" },
    { value: "hindi", label: "Hindi" },
    { value: "indonesian", label: "Indonésio" },
    { value: "italian", label: "Italiano" },
    { value: "japanese", label: "Japonês" },
    { value: "korean", label: "Coreano" },
    { value: "persian", label: "Persa" },
    { value: "portuguese", label: "Português" },
    { value: "russian", label: "Russo" },
    { value: "spanish", label: "Espanhol" },
    { value: "swedish", label: "Sueco" },
    { value: "turkish", label: "Turco" },
    { value: "urdu", label: "Urdu" },
    { value: "vietnamese", label: "Vietnamita" },
  ];

  const dateFormats = [
    { value: "mm-dd-yy", label: "mm-dd-yy" },
    { value: "dd-mm-yy", label: "dd-mm-yy" },
    { value: "yy-mm-dd", label: "yy-mm-dd" },
    { value: "mmm-dd-yy", label: "mmm-dd-yy" },
    { value: "dd-mmmm-yy", label: "dd-mmmm-yy" },
    { value: "yyyy-mm-dd", label: "yyyy-mm-dd" },
    { value: "dd-mmm-yyyy", label: "dd-mmm-yyyy" },
    { value: "dd-mmmm-yyyy", label: "dd-mmmm-yyyy" },
  ];

  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "Geral", icon: Settings },
    { id: "users", label: "Usuários", icon: Users },
    { id: "security", label: "Login e Segurança", icon: Lock },
    { id: "website", label: "Informações do Site", icon: Globe2 },
    { id: "api", label: "Chaves de API", icon: Key },
    { id: "files", label: "Arquivos e Armazenamento", icon: Upload },
    { id: "email", label: "E-mail e SMS", icon: Mail },
    { id: "ai", label: "Configurações de IA", icon: Bot },
    { id: "features", label: "Recursos", icon: Layers },
    { id: "payments", label: "Pagamentos", icon: DollarSign },
    { id: "apps", label: "Aplicativos Móveis", icon: Smartphone },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">Configure as definições da sua plataforma</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
      </div>

      {/* ── General Tab ── */}
      {activeTab === "general" && (
        <>
      <SettingsSection title="Configuração Geral" icon={Settings} description="Configurações e comportamento principais da plataforma">
        <Separator />
        <SettingToggle
          label="Sistema de Cache"
          description="Acelere seu site em até 80%. A pasta cache e todas as permissões de subpastas devem ser definidas como 777."
          checked={cacheSystem}
          onCheckedChange={setCacheSystem}
        />
        <Separator />
        <SettingToggle
          label="Modo de Manutenção"
          description="Coloque todo o site em manutenção. Acesse o painel administrativo via /admin para restaurar."
          checked={maintenanceMode}
          onCheckedChange={setMaintenanceMode}
        />
        {maintenanceMode && (
          <div className="ml-1 mb-1">
            <Badge variant="destructive" className="text-[10px]">O site está em modo de manutenção</Badge>
          </div>
        )}
        <Separator />
        <SettingToggle
          label="URL Amigável para SEO"
          description="Ative o carregamento suave para economizar largura de banda e melhorar o ranking de busca."
          checked={seoFriendlyUrl}
          onCheckedChange={setSeoFriendlyUrl}
        />
        <Separator />
        <SettingToggle
          label="Desenvolvedores (Sistema de API)"
          description="Mostrar página /developers para todos os usuários para requisições de API."
          checked={developersApi}
          onCheckedChange={setDevelopersApi}
        />
        <Separator />
        <SettingToggle
          label="Usuários da Página de Boas-Vindas"
          description="Permitir que usuários não logados visualizem perfis de usuários na página de boas-vindas."
          checked={welcomePageUsers}
          onCheckedChange={setWelcomePageUsers}
        />
        <Separator />

        <div className="py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Idioma Padrão</label>
              <p className="text-xs text-muted-foreground mb-1.5">Defina o idioma padrão do seu site.</p>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Formato de Data</label>
              <p className="text-xs text-muted-foreground mb-1.5">Defina o formato de data padrão do seu site.</p>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dateFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Página de Destino</label>
          <p className="text-xs text-muted-foreground mb-1.5">Se as pessoas não estiverem logadas, serão redirecionadas para esta página.</p>
          <Select value={landingPage} onValueChange={setLandingPage}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="login">Página de Login</SelectItem>
              <SelectItem value="register">Página de Registro</SelectItem>
              <SelectItem value="newsfeed">Página de Feed de Notícias</SelectItem>
              <SelectItem value="directory">Página de Diretório</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>
      </>
      )}

      {/* ── Users Tab ── */}
      {activeTab === "users" && (
        <>
      <SettingsSection title="Configuração de Usuário" icon={Users} description="Configurações de comportamento do usuário e acesso a recursos">
        <SettingToggle
          label="Usuários Online"
          description="Mostrar usuários ativos no momento na página inicial."
          checked={onlineUsers}
          onCheckedChange={setOnlineUsers}
        />
        <Separator />
        <SettingToggle
          label="Status de Última Visualização do Usuário"
          description="Permitir que os usuários definam seu status, online e última vez ativo."
          checked={lastSeenStatus}
          onCheckedChange={setLastSeenStatus}
        />
        <Separator />
        <SettingToggle
          label="Exclusão de Conta de Usuário"
          description="Permitir que os usuários excluam suas contas."
          checked={accountDeletion}
          onCheckedChange={setAccountDeletion}
        />
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Alteração de Fundo de Perfil</label>
          <p className="text-xs text-muted-foreground mb-1.5">Permitir que os usuários alterem seus fundos de perfil fazendo o upload de uma imagem.</p>
          <Select value={profileBgChange} onValueChange={setProfileBgChange}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Apenas Administradores</SelectItem>
              <SelectItem value="all">Todos os Usuários</SelectItem>
              <SelectItem value="verified">Apenas Usuários Verificados</SelectItem>
              <SelectItem value="pro">Apenas Usuários Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Sistema de Amigos</label>
          <p className="text-xs text-muted-foreground mb-1.5">Escolha entre o sistema de Seguir e de Amigos. A alteração excluirá as conexões existentes.</p>
          <Select value={friendsSystem} onValueChange={setFriendsSystem}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="friend">Sistema de Amigos</SelectItem>
              <SelectItem value="follow">Sistema de Seguidores</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Limite do Sistema de Conectividade</label>
          <p className="text-xs text-muted-foreground mb-1.5">Quantos amigos cada usuário pode ter?</p>
          <Input type="number" value={connectivityLimit} onChange={(e) => setConnectivityLimit(e.target.value)} className="h-9 text-sm max-w-[120px]" />
        </div>
        <Separator />

        <SettingToggle
          label="Sistema de Convite de Usuários"
          description="Permitir que os usuários convidem outros usuários para o seu site."
          checked={userInviteSystem}
          onCheckedChange={setUserInviteSystem}
        />
        {userInviteSystem && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Limite de links de convite</label>
                <Input type="number" value={inviteLinksLimit} onChange={(e) => setInviteLinksLimit(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Links válidos por</label>
                <Select value={inviteLinksPeriod} onValueChange={setInviteLinksPeriod}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hour">1 Hora</SelectItem>
                    <SelectItem value="1day">1 Dia</SelectItem>
                    <SelectItem value="1week">1 Semana</SelectItem>
                    <SelectItem value="1month">1 Mês</SelectItem>
                    <SelectItem value="1year">1 Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </SettingsSection>
      </>
      )}

      {/* ── General Tab (cont): Other Settings + Notifications ── */}
      {activeTab === "general" && (
        <>
      <SettingsSection title="Outras Configurações" icon={Globe2} description="Cache, censura e configurações diversas">
        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Palavras Censuradas</label>
          <p className="text-xs text-muted-foreground mb-1.5">Palavras a serem censuradas e substituídas por *** em mensagens, publicações, comentários etc., separadas por vírgula.</p>
          <Textarea
            value={censoredWords}
            onChange={(e) => setCensoredWords(e.target.value)}
            placeholder="palavra1, palavra2, palavra3..."
            className="text-sm resize-none"
            rows={3}
          />
        </div>
        <Separator />

        <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Cache da Página Inicial</label>
            <p className="text-xs text-muted-foreground mb-1.5">Ative para economizar uso do banco de dados e aumentar a velocidade.</p>
            <Select value={homePageCaching} onValueChange={setHomePageCaching}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2min">A cada 2 minutos</SelectItem>
                <SelectItem value="never">Nunca armazenar em cache</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Cache da Página de Perfil</label>
            <p className="text-xs text-muted-foreground mb-1.5">Atualizar dados da barra lateral a cada intervalo X.</p>
            <Select value={profilePageCaching} onValueChange={setProfilePageCaching}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30sec">A cada 30 segundos</SelectItem>
                <SelectItem value="2min">A cada 2 minutos</SelectItem>
                <SelectItem value="1hour">A cada 1 hora</SelectItem>
                <SelectItem value="2hours">A cada 2 horas</SelectItem>
                <SelectItem value="12hours">A cada 12 horas</SelectItem>
                <SelectItem value="24hours">A cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Chave de API Exchangerate</label>
          <p className="text-xs text-muted-foreground mb-1.5">Sua Chave de API Exchangerate para conversão de moedas.</p>
          <Input
            type="password"
            value={exchangerateApiKey}
            onChange={(e) => setExchangerateApiKey(e.target.value)}
            placeholder="Digite a chave de API..."
            className="h-9 text-sm max-w-md"
          />
        </div>
      </SettingsSection>
      </>
      )}

      {/* ── Login & Security Tab ── */}
      {activeTab === "security" && (
        <>
      <SettingsSection title="Login e Cadastro" icon={Lock} description="Configurações de autenticação, segurança e cadastro">
        <SettingToggle
          label="Cadastro de Usuários"
          description="Permitir que os usuários criem contas no seu site."
          checked={userRegistration}
          onCheckedChange={setUserRegistration}
        />
        <Separator />
        <SettingToggle
          label="Nome de Usuário Automático no Cadastro"
          description="Gerar um nome de usuário automático ao se cadastrar. O formulário de registro solicitará o nome e o sobrenome."
          checked={autoUsername}
          onCheckedChange={setAutoUsername}
        />
        <Separator />
        <SettingToggle
          label="Sistema de Complexidade de Senha"
          description="Exigir senhas fortes, incluindo letras, números e caracteres especiais."
          checked={passwordComplexity}
          onCheckedChange={setPasswordComplexity}
        />
        <Separator />
        <SettingToggle
          label="Detecção de Login Incomum"
          description="Enviar um link de confirmação quando o usuário fizer login a partir de um novo local."
          checked={unusualLogin}
          onCheckedChange={setUnusualLogin}
        />
        <Separator />
        <SettingToggle
          label="Lembrar Deste Dispositivo"
          description="Lembrar deste dispositivo na página de boas-vindas."
          checked={rememberDevice}
          onCheckedChange={setRememberDevice}
        />
        <Separator />
        <SettingToggle
          label="Autenticação de Dois Fatores (2FA)"
          description="Enviar código de confirmação por e-mail ou SMS quando o usuário fizer login."
          checked={twoFactorAuth}
          onCheckedChange={setTwoFactorAuth}
        />
        {twoFactorAuth && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Método 2FA</label>
            <Select value={twoFactorMethod} onValueChange={setTwoFactorMethod}>
              <SelectTrigger className="h-8 text-sm mt-1 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Endereço de E-mail</SelectItem>
                <SelectItem value="sms">SMS / Número de Telefone</SelectItem>
                <SelectItem value="both">Ambos Juntos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Separator />
        <SettingToggle
          label="Google Authenticator"
          description="Exigir código do Google Authenticator quando o usuário fizer login."
          checked={googleAuth}
          onCheckedChange={setGoogleAuth}
        />
        <Separator />
        <SettingToggle
          label="Configurações do Authy"
          description="Exigir código do Authy quando o usuário fizer login."
          checked={authySettings}
          onCheckedChange={setAuthySettings}
        />
        {authySettings && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Token do Authy</label>
            <Input
              type="password"
              value={authyToken}
              onChange={(e) => setAuthyToken(e.target.value)}
              placeholder="Token do Authy da sua conta Twilio"
              className="h-8 text-sm mt-1 max-w-md"
            />
          </div>
        )}
        <Separator />
        <SettingToggle
          label="Validação de Conta"
          description="Enviar um link de ativação após o cadastro."
          checked={accountValidation}
          onCheckedChange={setAccountValidation}
        />
        {accountValidation && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Método de Validação</label>
            <Select value={validationMethod} onValueChange={setValidationMethod}>
              <SelectTrigger className="h-8 text-sm mt-1 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Endereço de E-mail</SelectItem>
                <SelectItem value="sms">SMS / Número de Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Separator />
        <SettingToggle
          label="reCaptcha"
          description="Ativar o reCaptcha para evitar cadastros de spam."
          checked={recaptcha}
          onCheckedChange={setRecaptcha}
        />
        {recaptcha && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chave do Recaptcha</label>
              <Input value={recaptchaKey} onChange={(e) => setRecaptchaKey(e.target.value)} className="h-8 text-sm mt-1" placeholder="Chave do site" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chave Secreta do Recaptcha</label>
              <Input type="password" value={recaptchaSecret} onChange={(e) => setRecaptchaSecret(e.target.value)} className="h-8 text-sm mt-1" placeholder="Chave secreta" />
            </div>
          </div>
        )}
        <Separator />
        <SettingToggle
          label="Prevenir Tentativas de Login Mal-sucedidas"
          description="Rastrear e interromper ataques de força bruta."
          checked={preventBadLogin}
          onCheckedChange={setPreventBadLogin}
        />
        {preventBadLogin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Limite de Login</label>
              <p className="text-[10px] text-muted-foreground">Tentativas máximas antes do bloqueio</p>
              <Input type="number" value={loginLimit} onChange={(e) => setLoginLimit(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tempo de Bloqueio (Minutos)</label>
              <p className="text-[10px] text-muted-foreground">Duração do bloqueio</p>
              <Input type="number" value={lockoutTime} onChange={(e) => setLockoutTime(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
        )}
        <Separator />

        <div className="py-3">
          <label className="text-sm font-medium text-foreground">Limites de Cadastro</label>
          <p className="text-xs text-muted-foreground mb-1.5">Quantas contas podem ser criadas por hora.</p>
          <Input type="number" value={registrationLimit} onChange={(e) => setRegistrationLimit(e.target.value)} className="h-9 text-sm max-w-[120px]" />
        </div>
        <Separator />

        <SettingToggle
          label="Sistema de Nomes de Usuário Reservados"
          description="Impedir que os usuários utilizem nomes de usuário reservados."
          checked={reservedUsernames}
          onCheckedChange={setReservedUsernames}
        />
        {reservedUsernames && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Nomes de Usuário Reservados</label>
            <Textarea
              value={reservedUsernamesList}
              onChange={(e) => setReservedUsernamesList(e.target.value)}
              placeholder="admin, moderador, suporte..."
              className="text-sm resize-none mt-1"
              rows={2}
            />
          </div>
        )}
        <Separator />
        <SettingToggle
          label="Desativar Página Inicial"
          description="Desativar a página de inicialização para novos visitantes."
          checked={disableStartPage}
          onCheckedChange={setDisableStartPage}
        />
      </SettingsSection>

      <SettingsSection title="Configurações de Notificação" icon={Bell} description="Configure o comportamento de notificação para os usuários">
        <SettingToggle
          label="Notificações por E-mail"
          description="Enviar notificações por e-mail aos usuários após receberem notificações do site."
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
        />
        <Separator />
        <SettingToggle
          label="Notificações de Visita ao Perfil"
          description="Enviar uma notificação quando alguém visitar o perfil de um usuário."
          checked={profileVisitNotifications}
          onCheckedChange={setProfileVisitNotifications}
        />
        <Separator />
        <SettingToggle
          label="Notificação em Nova Publicação"
          description="Enviar uma notificação aos seguidores quando um usuário criar uma nova publicação."
          checked={newPostNotification}
          onCheckedChange={setNewPostNotification}
        />
      </SettingsSection>
      </>
      )}

      {/* ── Website Info Tab ── */}
      {activeTab === "website" && (
        <>
      {/* Website Information */}
      <SettingsSection title="Informações do Site" icon={Globe2} description="Configuração de SEO, marca e analytics">
        <div className="py-3 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Título do Site</label>
            <p className="text-xs text-muted-foreground mb-1.5">Título geral do seu site, ele aparecerá no Google e na aba do seu navegador.</p>
            <Input value={websiteTitle} onChange={(e) => setWebsiteTitle(e.target.value)} className="h-9 text-sm" placeholder="Minha Rede Social" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Nome do Site</label>
            <p className="text-xs text-muted-foreground mb-1.5">Nome do seu site, ele aparecerá no rodapé do site e nos E-mails.</p>
            <Input value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} className="h-9 text-sm" placeholder="MinhaRedeSocial" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Palavras-chave do Site</label>
            <p className="text-xs text-muted-foreground mb-1.5">Palavras-chave do seu site, usadas principalmente para SEO e motores de busca.</p>
            <Input value={websiteKeywords} onChange={(e) => setWebsiteKeywords(e.target.value)} className="h-9 text-sm" placeholder="rede social, comunidade, amigos" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição do Site</label>
            <p className="text-xs text-muted-foreground mb-1.5">Descrição do seu site, usada principalmente para SEO e motores de busca. Recomendável no máximo 100 caracteres.</p>
            <Textarea value={websiteDescription} onChange={(e) => setWebsiteDescription(e.target.value)} className="text-sm resize-none" rows={2} placeholder="Uma rede social para conectar pessoas..." maxLength={100} />
            <p className="text-[10px] text-muted-foreground mt-1">{websiteDescription.length}/100 caracteres</p>
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-foreground">Logo do Site</label>
            <p className="text-xs text-muted-foreground mb-1.5">Você pode alterar sua logo a partir de Alterar Design do Site.</p>
            <Button variant="outline" size="sm" onClick={onNavigateToDesign}>Alterar Design do Site</Button>
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-foreground">Código do Google Analytics</label>
            <p className="text-xs text-muted-foreground mb-1.5">Cole seu código completo do Google Analytics aqui para rastrear o tráfego.</p>
            <Textarea value={googleAnalyticsCode} onChange={(e) => setGoogleAnalyticsCode(e.target.value)} className="text-sm resize-none font-mono" rows={3} placeholder="<!-- Google Analytics --> ..." />
          </div>
        </div>
      </SettingsSection>
      </>
      )}

      {/* ── API Keys Tab ── */}
      {activeTab === "api" && (
        <>
      {/* Features API Keys */}
      <SettingsSection title="Chaves de API dos Recursos" icon={Key} description="Chaves de API para mapas, tradução e serviços de mídia">
        <SettingToggle
          label="Google Maps"
          description="Mostrar Google Maps em Publicações, Perfil, Configurações, Anúncios."
          checked={googleMaps}
          onCheckedChange={setGoogleMaps}
        />
        {googleMaps && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Chave de API do Google Maps</label>
            <p className="text-[10px] text-muted-foreground mb-1">Necessária para GEO e visualização do Google Maps.</p>
            <Input type="password" value={googleMapApi} onChange={(e) => setGoogleMapApi(e.target.value)} className="h-8 text-sm max-w-md" placeholder="Digite a chave de API do Google Maps..." />
          </div>
        )}
        <Separator />

        <SettingToggle
          label="Yandex Maps"
          description="Mostrar Yandex Maps em Publicações, Perfil, Configurações, Anúncios."
          checked={yandexMaps}
          onCheckedChange={setYandexMaps}
        />
        {yandexMaps && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Chave de API do Yandex Maps</label>
            <p className="text-[10px] text-muted-foreground mb-1">Necessária para GEO e visualização do Yandex Maps.</p>
            <Input type="password" value={yandexMapApi} onChange={(e) => setYandexMapApi(e.target.value)} className="h-8 text-sm max-w-md" placeholder="Digite a chave de API do Yandex Maps..." />
          </div>
        )}
        <Separator />

        <SettingToggle
          label="API de Tradução do Yandex"
          description="Traduzir texto da publicação usando Tradução do Yandex."
          checked={yandexTranslation}
          onCheckedChange={setYandexTranslation}
        />
        {yandexTranslation && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Chave de API de Tradução do Yandex</label>
            <Input type="password" value={yandexTranslationApi} onChange={(e) => setYandexTranslationApi(e.target.value)} className="h-8 text-sm max-w-md" placeholder="Digite a chave de API..." />
          </div>
        )}
        <Separator />

        <SettingToggle
          label="API de Tradução do Google"
          description="Traduzir texto da publicação usando Tradução do Google."
          checked={googleTranslation}
          onCheckedChange={setGoogleTranslation}
        />
        {googleTranslation && (
          <div className="pb-2">
            <label className="text-xs font-medium text-muted-foreground">Chave de API de Tradução do Google</label>
            <Input type="password" value={googleTranslationApi} onChange={(e) => setGoogleTranslationApi(e.target.value)} className="h-8 text-sm max-w-md" placeholder="Digite a chave de API..." />
          </div>
        )}
        <Separator />

        <div className="py-3 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Chave de API do YouTube</label>
            <p className="text-xs text-muted-foreground mb-1.5">Necessária para importar ou publicar vídeos do YouTube.</p>
            <Input type="password" value={youtubeApiKey} onChange={(e) => setYoutubeApiKey(e.target.value)} className="h-9 text-sm max-w-md" placeholder="Digite a chave de API do YouTube..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">API do Giphy</label>
            <p className="text-xs text-muted-foreground mb-1.5">Necessária para GIFs em mensagens, publicações e comentários.</p>
            <Input type="password" value={giphyApi} onChange={(e) => setGiphyApi(e.target.value)} className="h-9 text-sm max-w-md" placeholder="Digite a chave de API do Giphy..." />
          </div>
        </div>
      </SettingsSection>


      {/* ── File Upload Configuration ── */}
      <SettingsSection title="Upload e Compartilhamento de Arquivos" description="Configure os recursos de upload e compartilhamento de arquivos para sua plataforma." icon={Upload}>
        <SettingToggle label="Upload e Compartilhamento de Arquivos" description="Ao ativar este recurso, o usuário poderá compartilhar e fazer upload de arquivos no seu site." checked={fileUpload} onCheckedChange={setFileUpload} />
        <Separator />
        <SettingToggle label="Upload e Compartilhamento de Vídeos" description="Ative a capacidade de os usuários compartilharem e fazerem upload de vídeos. Você pode configurar as definições do conversor de vídeo nas Configurações do FFMPEG abaixo." checked={videoUpload} onCheckedChange={setVideoUpload} />
        <Separator />
        <SettingToggle label="Upload de Reels" description="Ative a capacidade de os usuários compartilharem e fazerem upload de reels. Você pode configurar as definições do conversor de vídeo nas Configurações do FFMPEG abaixo." checked={reelsUpload} onCheckedChange={setReelsUpload} />
        <Separator />
        <SettingToggle label="Upload e Compartilhamento de Áudio" description="Ative a capacidade de os usuários compartilharem e fazerem upload de músicas e arquivos de áudio." checked={audioUpload} onCheckedChange={setAudioUpload} />
        <Separator />
        <SettingToggle label="Upload e Modificações de CSS" description="Permitir que os usuários façam upload de seus próprios arquivos CSS para personalizar o perfil." checked={cssUpload} onCheckedChange={setCssUpload} />
      </SettingsSection>

      <SettingsSection title="Limites de Upload e Arquivos" description="Importante: Certifique-se de não permitir arquivos PHP, JS, HTML, XML, XPHP, PHP5 — seu site pode estar em risco." icon={Shield}>
        <div>
          <label className="text-sm font-medium text-foreground">Extensões Permitidas</label>
          <p className="text-xs text-muted-foreground mb-1.5">Apenas estes tipos de arquivos que o usuário pode fazer upload no seu site (separados por vírgula).</p>
          <Textarea value={allowedExtensions} onChange={(e) => setAllowedExtensions(e.target.value)} className="text-sm min-h-[60px]" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Tipos MIME Permitidos</label>
          <p className="text-xs text-muted-foreground mb-1.5">Apenas estes tipos MIME de arquivos que o usuário pode fazer upload no seu site (separados por vírgula).</p>
          <Textarea value={allowedMimeTypes} onChange={(e) => setAllowedMimeTypes(e.target.value)} className="text-sm min-h-[60px]" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Tamanho Máximo de Upload</label>
          <p className="text-xs text-muted-foreground mb-1.5">Defina o tamanho máximo de upload que um usuário pode usar para fazer upload de arquivos, vídeos, músicas e imagens.</p>
          <Select value={maxUploadSize} onValueChange={setMaxUploadSize}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2 MB", "6 MB", "12 MB", "24 MB", "48 MB", "96 MB", "256 MB", "512 MB", "1 GB", "5 GB", "10 GB"].map((s) => (
                <SelectItem key={s} value={s.toLowerCase().replace(" ", "")}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Nível de Compressão de Imagem</label>
          <p className="text-xs text-muted-foreground mb-1.5">Defina o nível de compressão de imagem. Quanto mais alto escolher, menor será a qualidade.</p>
          <Select value={imageCompression} onValueChange={setImageCompression}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"].map((l, i) => {
                const values = ["verylow", "low", "medium", "high", "veryhigh"];
                return <SelectItem key={l} value={values[i]}>{l}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      <SettingsSection title="Configurações do Conversor de Vídeo FFMPEG" description="Este sistema compactará, converterá e otimizará vídeos para mp4. Requer que o 'ffmpeg' esteja instalado no seu servidor." icon={FileVideo}>
        <SettingToggle label="Sistema FFMPEG" description="Ative o sistema de processamento de vídeo FFMPEG para conversão e otimização automática de vídeos." checked={ffmpegSystem} onCheckedChange={setFfmpegSystem} />
        {ffmpegSystem && (
          <>
            <Separator />
            <div>
              <label className="text-sm font-medium text-foreground">Caminho do Arquivo Binário do FFMPEG</label>
              <p className="text-xs text-muted-foreground mb-1.5">Exemplo: Linux(/usr/bin/ffmpeg) ou Windows(C:\ffmpeg\bin\ffmpeg.exe)</p>
              <Input value={ffmpegPath} onChange={(e) => setFfmpegPath(e.target.value)} className="h-9 text-sm max-w-md" />
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-foreground">Velocidade de Conversão do Vídeo</label>
              <p className="text-xs text-muted-foreground mb-1.5">Usar um preset mais lento oferece melhor compactação ou qualidade por tamanho de arquivo.</p>
              <Select value={ffmpegSpeed} onValueChange={setFfmpegSpeed}>
                <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Ultrafast", "Superfast", "Veryfast", "Faster", "Fast", "Medium", "Slow", "Slower", "Veryslow"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-foreground">Extensões de Vídeo Permitidas</label>
              <p className="text-xs text-muted-foreground mb-1.5">Apenas estes tipos de vídeos que o usuário pode fazer upload no seu site (separados por vírgula).</p>
              <Textarea value={ffmpegExtensions} onChange={(e) => setFfmpegExtensions(e.target.value)} className="text-sm min-h-[50px]" />
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-foreground">Tipos MIME de Vídeo Permitidos</label>
              <p className="text-xs text-muted-foreground mb-1.5">Apenas estes tipos MIME de vídeos que o usuário pode fazer upload (separados por vírgula).</p>
              <Textarea value={ffmpegMimeTypes} onChange={(e) => setFfmpegMimeTypes(e.target.value)} className="text-sm min-h-[50px]" />
            </div>
            <Separator />
            <div className="flex items-center gap-3 py-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("FFMPEG está configurado e funcionando corretamente.")}>
                <Bug className="w-3.5 h-3.5" />
                Depurar FFMPEG
              </Button>
              <p className="text-xs text-muted-foreground">Teste a configuração do FFMPEG e certifique-se de que o sistema está funcionando bem.</p>
            </div>
          </>
        )}
      </SettingsSection>

      {/* ── Storage & CDN ── */}
      <SettingsSection title="Configuração de Armazenamento e CDN" description="Importante: Você não pode ativar dois ou três armazenamentos ao mesmo tempo." icon={Database}>
        {/* Amazon S3 */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-sm">Configuração do Amazon S3</CardTitle>
              </div>
              <Switch checked={amazonS3} onCheckedChange={setAmazonS3} />
            </div>
            <CardDescription className="text-xs">Ative o Armazenamento da Amazon para armazenar seus arquivos no Amazon S3.</CardDescription>
          </CardHeader>
          {amazonS3 && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div>
                <label className="text-xs font-medium">Nome do Bucket Amazon</label>
                <Input value={s3BucketName} onChange={(e) => setS3BucketName(e.target.value)} className="h-8 text-sm mt-1" placeholder="seu-bucket-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Chave do Amazon S3</label>
                  <Input value={s3Key} onChange={(e) => setS3Key(e.target.value)} className="h-8 text-sm mt-1" placeholder="Chave AWS" />
                </div>
                <div>
                  <label className="text-xs font-medium">Chave Secreta do Amazon S3</label>
                  <Input type="password" value={s3SecretKey} onChange={(e) => setS3SecretKey(e.target.value)} className="h-8 text-sm mt-1" placeholder="Segredo AWS" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint Personalizado (Opcional)</label>
                <Input value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} className="h-8 text-sm mt-1" placeholder="https://customCDNdomain.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Região do Bucket</label>
                <Select value={s3Region} onValueChange={setS3Region}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      { v: "us-east-1", l: "US East (N. Virginia)" }, { v: "us-east-2", l: "US East (Ohio)" },
                      { v: "us-west-1", l: "US West (N. California)" }, { v: "us-west-2", l: "US West (Oregon)" },
                      { v: "eu-west-1", l: "Europe (Ireland)" }, { v: "eu-west-2", l: "Europe (London)" },
                      { v: "eu-central-1", l: "Europe (Frankfurt)" }, { v: "ap-southeast-1", l: "Asia Pacific (Singapore)" },
                      { v: "ap-northeast-1", l: "Asia Pacific (Tokyo)" }, { v: "sa-east-1", l: "South America (São Paulo)" },
                    ].map((r) => <SelectItem key={r.v} value={r.v}>{r.l} ({r.v})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">Antes de ativar, envie toda a pasta "upload/" para o seu bucket</Badge>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Digitalocean Spaces */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm">DigitalOcean Spaces</CardTitle>
              </div>
              <Switch checked={digitalocean} onCheckedChange={setDigitalocean} />
            </div>
            <CardDescription className="text-xs">Ative o Armazenamento DigitalOcean para armazenar seus arquivos no Spaces.</CardDescription>
          </CardHeader>
          {digitalocean && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div>
                <label className="text-xs font-medium">Nome do Space</label>
                <Input value={doSpaceName} onChange={(e) => setDoSpaceName(e.target.value)} className="h-8 text-sm mt-1" placeholder="seu-space-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Chave</label>
                  <Input value={doKey} onChange={(e) => setDoKey(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Segredo</label>
                  <Input type="password" value={doSecret} onChange={(e) => setDoSecret(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint Personalizado (Opcional)</label>
                <Input value={doEndpoint} onChange={(e) => setDoEndpoint(e.target.value)} className="h-8 text-sm mt-1" placeholder="https://customCDNdomain.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Região</label>
                <Select value={doRegion} onValueChange={setDoRegion}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["NYC1", "NYC2", "NYC3", "SFO1", "SFO2", "TOR1", "LON1", "FRA1", "AMS2", "AMS3", "SGP1", "BLR1"].map((r) => (
                      <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Wasabi */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-green-500" />
                <CardTitle className="text-sm">Configuração do Wasabi</CardTitle>
              </div>
              <Switch checked={wasabi} onCheckedChange={setWasabi} />
            </div>
            <CardDescription className="text-xs">Ative o Armazenamento Wasabi para armazenar seus arquivos no Wasabi.</CardDescription>
          </CardHeader>
          {wasabi && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div>
                <label className="text-xs font-medium">Nome do Bucket</label>
                <Input value={wasabiBucket} onChange={(e) => setWasabiBucket(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Chave de Acesso</label>
                  <Input value={wasabiAccessKey} onChange={(e) => setWasabiAccessKey(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Chave Secreta</label>
                  <Input type="password" value={wasabiSecretKey} onChange={(e) => setWasabiSecretKey(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint Personalizado (Opcional)</label>
                <Input value={wasabiEndpoint} onChange={(e) => setWasabiEndpoint(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Região</label>
                <Select value={wasabiRegion} onValueChange={setWasabiRegion}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["us-east-1", "us-east-2", "us-west-1", "us-central-1", "eu-west-1", "eu-west-2", "eu-central-1", "eu-central-2", "ap-northeast-1", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* FTP */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-500" />
                <CardTitle className="text-sm">Configurações de FTP</CardTitle>
              </div>
              <Switch checked={ftpStorage} onCheckedChange={setFtpStorage} />
            </div>
            <CardDescription className="text-xs">Ative o Armazenamento FTP para armazenar seus arquivos em seu próprio servidor FTP. Isso pode diminuir a velocidade de upload/exclusão.</CardDescription>
          </CardHeader>
          {ftpStorage && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Nome do Host FTP</label>
                  <Input value={ftpHostname} onChange={(e) => setFtpHostname(e.target.value)} className="h-8 text-sm mt-1" placeholder="IP ou domínio" />
                </div>
                <div>
                  <label className="text-xs font-medium">Porta FTP</label>
                  <Input value={ftpPort} onChange={(e) => setFtpPort(e.target.value)} className="h-8 text-sm mt-1" placeholder="21" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Nome de Usuário FTP</label>
                  <Input value={ftpUsername} onChange={(e) => setFtpUsername(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Senha FTP</label>
                  <Input type="password" value={ftpPassword} onChange={(e) => setFtpPassword(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Caminho FTP</label>
                <Input value={ftpPath} onChange={(e) => setFtpPath(e.target.value)} className="h-8 text-sm mt-1" placeholder="Caminho para arquivos /upload" />
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint FTP</label>
                <Input value={ftpEndpoint} onChange={(e) => setFtpEndpoint(e.target.value)} className="h-8 text-sm mt-1" placeholder="ftpstorage.example.com" />
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Google Cloud */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-red-500" />
                <CardTitle className="text-sm">Google Cloud Storage</CardTitle>
              </div>
              <Switch checked={googleCloud} onCheckedChange={setGoogleCloud} />
            </div>
            <CardDescription className="text-xs">Ative o Google Cloud Storage para armazenar seus arquivos.</CardDescription>
          </CardHeader>
          {googleCloud && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div>
                <label className="text-xs font-medium">Nome do Bucket</label>
                <Input value={gcBucketName} onChange={(e) => setGcBucketName(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Caminho do Arquivo do Google Cloud</label>
                <p className="text-[10px] text-muted-foreground">Caminho para o arquivo JSON do Google Cloud no seu servidor.</p>
                <Input value={gcFilePath} onChange={(e) => setGcFilePath(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint Personalizado (Opcional)</label>
                <Input value={gcEndpoint} onChange={(e) => setGcEndpoint(e.target.value)} className="h-8 text-sm mt-1" placeholder="https://customCDNdomain.com" />
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Backblaze */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-rose-500" />
                <CardTitle className="text-sm">Configuração do Backblaze</CardTitle>
              </div>
              <Switch checked={backblaze} onCheckedChange={setBackblaze} />
            </div>
            <CardDescription className="text-xs">Ative o Armazenamento Backblaze para armazenar seus arquivos.</CardDescription>
          </CardHeader>
          {backblaze && (
            <CardContent className="space-y-3 px-4 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">ID do Bucket</label>
                  <Input value={bbBucketId} onChange={(e) => setBbBucketId(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Nome do Bucket</label>
                  <Input value={bbBucketName} onChange={(e) => setBbBucketName(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Região do Bucket</label>
                <Input value={bbBucketRegion} onChange={(e) => setBbBucketRegion(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">ID da Chave de Acesso</label>
                  <Input value={bbAccessKeyId} onChange={(e) => setBbAccessKeyId(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Chave de Acesso</label>
                  <Input type="password" value={bbAccessKey} onChange={(e) => setBbAccessKey(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Endpoint Personalizado (Opcional)</label>
                <Input value={bbEndpoint} onChange={(e) => setBbEndpoint(e.target.value)} className="h-8 text-sm mt-1" placeholder="https://customCDNdomain.com" />
              </div>
            </CardContent>
          )}
        </Card>
      </SettingsSection>
      </>
      )}

      {/* ── Email & SMS Tab ── */}
      {activeTab === "email" && (
        <>
      <SettingsSection title="Configuração de E-mail" description="Configure as definições do seu servidor de e-mail para envio de mensagens aos usuários." icon={Mail}>
        <div>
          <label className="text-sm font-medium text-foreground">Servidor de E-mail</label>
          <p className="text-xs text-muted-foreground mb-1.5">Selecione qual servidor de e-mail você deseja usar. A função Server Mail não é recomendada.</p>
          <Select value={emailServer} onValueChange={setEmailServer}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="servermail">Server Mail (Padrão)</SelectItem>
              <SelectItem value="smtp">Servidor SMTP</SelectItem>
              <SelectItem value="mailgun">Mailgun</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">E-mail Padrão do Site</label>
          <p className="text-xs text-muted-foreground mb-1.5">Este é o e-mail padrão do seu site, usado para enviar mensagens aos usuários.</p>
          <Input value={defaultEmail} onChange={(e) => setDefaultEmail(e.target.value)} className="h-9 text-sm max-w-md" placeholder="info@yourseite.com" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Host SMTP</label>
          <p className="text-xs text-muted-foreground mb-1.5">O nome de host da sua conta SMTP, pode ser um IP, domínio ou subdomínio.</p>
          <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="h-9 text-sm max-w-md" placeholder="mail.yoursite.com" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Nome de Usuário SMTP</label>
          <p className="text-xs text-muted-foreground mb-1.5">O nome de usuário da sua conta SMTP.</p>
          <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} className="h-9 text-sm max-w-md" placeholder="info@yourseite.com" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Senha SMTP</label>
          <p className="text-xs text-muted-foreground mb-1.5">A senha da sua conta SMTP. A chave secreta não é exibida por motivos de segurança.</p>
          <Input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} className="h-9 text-sm max-w-md" placeholder="••••••••" />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="text-sm font-medium text-foreground">Porta SMTP</label>
            <p className="text-xs text-muted-foreground mb-1.5">587 para TLS, 465 para SSL.</p>
            <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="h-9 text-sm" placeholder="465" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Criptografia SMTP</label>
            <p className="text-xs text-muted-foreground mb-1.5">Método de criptografia.</p>
            <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ssl">SSL (Seguro)</SelectItem>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="none">Nenhum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="flex items-center gap-3 py-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.")}>
            <Send className="w-3.5 h-3.5" />
            Testar Servidor de E-mail
          </Button>
          <p className="text-xs text-muted-foreground">Uma mensagem de teste será enviada para o endereço de e-mail da sua conta.</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Configurações de SMS" description="Para começar a enviar SMS, crie uma conta e compre créditos no Twilio, BulkSMS, Infobip ou Msg91." icon={Phone}>
        <div>
          <label className="text-sm font-medium text-foreground">Provedor de SMS Padrão</label>
          <p className="text-xs text-muted-foreground mb-1.5">Selecione qual provedor de SMS deseja usar. Você só pode usar um de cada vez.</p>
          <Select value={defaultSmsProvider} onValueChange={setDefaultSmsProvider}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="bulksms">BulkSMS</SelectItem>
              <SelectItem value="infobip">Infobip</SelectItem>
              <SelectItem value="msg91">Msg91</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Seu Número de Telefone</label>
          <p className="text-xs text-muted-foreground mb-1.5">Defina o número padrão do seu site usado para enviar SMS aos usuários, ex: (+9053...)</p>
          <Input value={smsPhoneNumber} onChange={(e) => setSmsPhoneNumber(e.target.value)} className="h-9 text-sm max-w-md" placeholder="+1234567890" />
        </div>
        <Separator />

        {/* BulkSMS */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Configuração do BulkSMS</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Nome de Usuário do BulkSMS</label>
                <Input value={bulkSmsUsername} onChange={(e) => setBulkSmsUsername(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Senha do BulkSMS</label>
                <Input type="password" value={bulkSmsPassword} onChange={(e) => setBulkSmsPassword(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Twilio */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Configuração do Twilio</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            <div>
              <label className="text-xs font-medium">SID da Conta Twilio</label>
              <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Token de Autenticação do Twilio</label>
              <Input type="password" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Número de Telefone do Twilio</label>
              <Input value={twilioPhone} onChange={(e) => setTwilioPhone(e.target.value)} className="h-8 text-sm mt-1" placeholder="+1234567890" />
            </div>
          </CardContent>
        </Card>

        {/* Infobip */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Configuração do Infobip</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            <div>
              <label className="text-xs font-medium">Chave de API do Infobip</label>
              <Input value={infobipApiKey} onChange={(e) => setInfobipApiKey(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">URL Base do Infobip</label>
              <Input value={infobipBaseUrl} onChange={(e) => setInfobipBaseUrl(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Msg91 */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Configuração do Msg91</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            <div>
              <label className="text-xs font-medium">Chave de Autenticação do Msg91</label>
              <Input value={msg91AuthKey} onChange={(e) => setMsg91AuthKey(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">ID DLT do Msg91</label>
              <Input value={msg91DltId} onChange={(e) => setMsg91DltId(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </CardContent>
        </Card>

        <Separator />
        <div className="flex items-center gap-3 py-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("SMS de teste enviado com sucesso! Verifique seu telefone.")}>
            <Send className="w-3.5 h-3.5" />
            Testar Servidor SMS
          </Button>
          <p className="text-xs text-muted-foreground">Uma mensagem de teste será enviada para o seu telefone.</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Depurar Entregabilidade de E-mail" description="Teste a entregabilidade de e-mail e certifique-se de que o sistema está funcionando corretamente." icon={TestTube}>
        <div className="flex items-center gap-3 py-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEmailDebugLog("✓ SPF Record: Pass\n✓ DKIM Record: Pass\n✓ DMARC Record: Pass\n✓ Reverse DNS: Pass\n✓ SMTP Connection: Success\n✓ Email Deliverability Score: 9.5/10")}>
            <Bug className="w-3.5 h-3.5" />
            Depurar Entregabilidade de E-mail
          </Button>
        </div>
        {emailDebugLog && (
          <div className="bg-muted/50 rounded-md p-3 border">
            <p className="text-xs font-medium text-foreground mb-1">Log de Depuração</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{emailDebugLog}</pre>
          </div>
        )}
        {!emailDebugLog && (
          <p className="text-xs text-muted-foreground italic">Clique em Depurar Entregabilidade de E-mail para exibir os resultados do teste.</p>
        )}
      </SettingsSection>
      </>
      )}

      {/* ── AI Settings Tab ── */}
      {activeTab === "ai" && (
        <>
      {/* ── AI Settings ── */}
      <SettingsSection title="Configurações do OpenAI" description="Configure sua chave de API do OpenAI e o modelo de texto para os recursos baseados em IA." icon={Bot}>
        <div>
          <label className="text-sm font-medium text-foreground">Chave de API do OpenAI</label>
          <p className="text-xs text-muted-foreground mb-1.5">A chave secreta não é exibida por motivos de segurança, mas você ainda pode substituir a atual.</p>
          <Input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} className="h-9 text-sm max-w-md" placeholder="sk-sk-••••••••••••••••" />
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Modelo de Texto do OpenAI</label>
          <Select value={openaiModel} onValueChange={setOpenaiModel}>
            <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="gpt-4-0314">GPT-4-0314</SelectItem>
              <SelectItem value="gpt-4-32k">GPT-4-32K</SelectItem>
              <SelectItem value="gpt-4-32k-0314">GPT-4-32K-0314</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo-0301">GPT-3.5 Turbo-0301</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      <SettingsSection title="Recursos de IA" description="Ative ou desative recursos baseados em IA em toda a sua plataforma." icon={Sparkles}>
        <SettingToggle label="Sistema de Imagens de IA" description="Permitir que a IA gere imagens." checked={aiImages} onCheckedChange={setAiImages} />
        {aiImages && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">API de Imagens de IA</label>
            <Select value={aiImagesApi} onValueChange={setAiImagesApi}>
              <SelectTrigger className="h-8 text-sm max-w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="replicate">Replicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Separator />
        <SettingToggle label="Sistema de Publicações de IA" description="Permitir que a IA gere publicações." checked={aiPosts} onCheckedChange={setAiPosts} />
        {aiPosts && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">API de Publicações de IA</label>
            <Select value={aiPostsApi} onValueChange={setAiPostsApi}>
              <SelectTrigger className="h-8 text-sm max-w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="replicate">Replicate (não suportado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Separator />
        <SettingToggle label="Sistema de Blog de IA" description="Permitir que a IA gere artigos." checked={aiBlog} onCheckedChange={setAiBlog} />
        {aiBlog && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">API de Blog de IA</label>
            <Select value={aiBlogApi} onValueChange={setAiBlogApi}>
              <SelectTrigger className="h-8 text-sm max-w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="replicate">Replicate (não suportado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Separator />
        <SettingToggle label="Sistema de Avatar/Capa de IA" description="Permitir que os usuários editem o Avatar/Capa usando IA." checked={aiAvatarCover} onCheckedChange={setAiAvatarCover} />
        {aiAvatarCover && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">API de Avatar/Capa de IA</label>
            <Select value={aiAvatarApi} onValueChange={setAiAvatarApi}>
              <SelectTrigger className="h-8 text-sm max-w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (não suportado)</SelectItem>
                <SelectItem value="replicate">Replicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Configurações de IA do Replicate" description="Configure a API do Replicate para geração de imagens por IA." icon={Palette}>
        <div>
          <label className="text-sm font-medium text-foreground">Modelo do Replicate</label>
          <Select value={replicateModel} onValueChange={setReplicateModel}>
            <SelectTrigger className="h-9 text-sm max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prompthero/openjourney">prompthero/openjourney</SelectItem>
              <SelectItem value="stability-ai/stable-diffusion">stability-ai/stable-diffusion</SelectItem>
              <SelectItem value="22-hours/vintedois-diffusion">22-hours/vintedois-diffusion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-foreground">Token de API do Replicate</label>
          <Input type="password" value={replicateApiToken} onChange={(e) => setReplicateApiToken(e.target.value)} className="h-9 text-sm max-w-md" placeholder="r8_••••••••••••" />
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4 max-w-md">
          <div>
            <label className="text-xs font-medium">Passos de Inferência</label>
            <p className="text-[10px] text-muted-foreground">1 – 500</p>
            <Input value={replicateInferenceSteps} onChange={(e) => setReplicateInferenceSteps(e.target.value)} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Escala de Orientação</label>
            <p className="text-[10px] text-muted-foreground">1 – 20</p>
            <Input value={replicateGuidanceScale} onChange={(e) => setReplicateGuidanceScale(e.target.value)} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Semente</label>
            <p className="text-[10px] text-muted-foreground">Vazio = aleatório</p>
            <Input value={replicateSeed} onChange={(e) => setReplicateSeed(e.target.value)} className="h-8 text-sm mt-1" placeholder="Aleatória" />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Configurações de Créditos de IA" description="Configure a precificação de créditos para conteúdo gerado por IA." icon={CreditCard}>
        <div>
          <label className="text-sm font-medium text-foreground">Preço do Crédito</label>
          <p className="text-xs text-muted-foreground mb-1.5">Exemplo de Preço do Crédito: $1 = 10 créditos</p>
          <Input value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)} className="h-9 text-sm max-w-[150px]" placeholder="1" />
        </div>
        <Separator />
        <SettingToggle label="Sistema de Créditos para Imagens de IA" description="Ativar sistema de créditos para geração de imagens por IA." checked={aiImagesCreditSystem} onCheckedChange={setAiImagesCreditSystem} />
        {aiImagesCreditSystem && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">Preço da Imagem Gerada</label>
            <p className="text-[10px] text-muted-foreground mb-1">Créditos por imagem gerada</p>
            <Input value={generatedImagePrice} onChange={(e) => setGeneratedImagePrice(e.target.value)} className="h-8 text-sm max-w-[150px]" />
          </div>
        )}
        <Separator />
        <SettingToggle label="Sistema de Créditos para Texto de IA" description="Ativar sistema de créditos para geração de texto por IA." checked={aiTextCreditSystem} onCheckedChange={setAiTextCreditSystem} />
        {aiTextCreditSystem && (
          <div className="pl-4 pb-2">
            <label className="text-xs font-medium text-foreground">Preço da Palavra Gerada</label>
            <p className="text-[10px] text-muted-foreground mb-1">Créditos por palavra gerada</p>
            <Input value={generatedWordPrice} onChange={(e) => setGeneratedWordPrice(e.target.value)} className="h-8 text-sm max-w-[150px]" />
          </div>
        )}
      </SettingsSection>
      </>
      )}

      {/* ── Features Tab ── */}
      {activeTab === "features" && (
        <>
      {/* ── Manage Features ── */}
      <SettingsSection title="Configurações do Marketplace" description="Configure os recursos e limites do marketplace." icon={ShoppingBag}>
        <SettingToggle label="Marketplace" description="Ativar o recurso de marketplace para compra e venda de itens." checked={marketplaceEnabled} onCheckedChange={setMarketplaceEnabled} />
        {marketplaceEnabled && (
          <>
            <Separator />
            <SettingToggle label="Programa de Vendedores Verificados" description="Ativar o sistema de selo de vendedor verificado com base na contagem de anúncios, avaliações e idade da conta." checked={marketplaceVerifiedSellers} onCheckedChange={setMarketplaceVerifiedSellers} />
            <Separator />
            <SettingToggle label="Detecção de Fraude" description="Escanear e sinalizar automaticamente padrões de anúncios suspeitos (preços extremos, postagens em lote)." checked={marketplaceFraudDetection} onCheckedChange={setMarketplaceFraudDetection} />
            <Separator />
            <SettingToggle label="Sistema de Fazer Oferta" description="Permitir que os compradores proponham preços e negociem com os vendedores." checked={marketplaceOffers} onCheckedChange={setMarketplaceOffers} />
            <Separator />
            <SettingToggle label="Rastreamento de Histórico de Preços" description="Registrar todas as alterações de preços e exibir gráficos de tendências nas páginas dos anúncios." checked={marketplacePriceHistory} onCheckedChange={setMarketplacePriceHistory} />
            <Separator />
            <div className="grid grid-cols-2 gap-4 max-w-md py-2">
              <div>
                <label className="text-sm font-medium text-foreground">Máximo de Imagens por Anúncio</label>
                <Input value={marketplaceMaxImages} onChange={(e) => setMarketplaceMaxImages(e.target.value)} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Limite de Preço Máximo ($)</label>
                <Input value={marketplaceMaxPrice} onChange={(e) => setMarketplaceMaxPrice(e.target.value)} className="h-9 text-sm mt-1" />
              </div>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Configurações do Sistema de Anúncios" description="Configure formatos de anúncios, posicionamentos, preços, direcionamento e redes de anúncios de terceiros." icon={Megaphone}>
        <SettingToggle label="Sistema de Publicidade" description="Ativar o sistema de anúncios e conteúdo patrocinado na plataforma." checked={adsEnabled} onCheckedChange={setAdsEnabled} />
        {adsEnabled && (
          <>
            <Separator className="my-1" />
            <p className="text-xs font-semibold text-foreground pt-2 pb-1">Formatos e Posicionamentos de Anúncios</p>
            <SettingToggle label="Anúncios em Banner Horizontal" description="Exibir anúncios em banner no topo ou no rodapé das páginas." checked={adsBanner} onCheckedChange={setAdsBanner} />
            <Separator />
            <SettingToggle label="Publicações Patrocinadas (No Feed)" description="Exibir publicações patrocinadas no feed de atividades ao lado do conteúdo orgânico." checked={adsSponsoredPosts} onCheckedChange={setAdsSponsoredPosts} />
            <Separator />
            <SettingToggle label="Cartões de Anúncios na Barra Lateral" description="Exibir cartões promocionais na barra lateral direita." checked={adsSidebarCards} onCheckedChange={setAdsSidebarCards} />
            <Separator />
            <SettingToggle label="Anúncios Intersticiais" description="Exibir anúncios de sobreposição em tela cheia entre as navegações de páginas." checked={adsInterstitial} onCheckedChange={setAdsInterstitial} />
            {adsInterstitial && (
              <div className="pl-4 pb-2 grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="text-xs font-medium text-foreground">Acionar Após (navegações)</label>
                  <p className="text-[10px] text-muted-foreground">Exibir anúncio após X navegações de página.</p>
                  <Input value={adsInterstitialFrequency} onChange={(e) => setAdsInterstitialFrequency(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Tempo de Espera (minutos)</label>
                  <p className="text-[10px] text-muted-foreground">Minutos entre os anúncios intersticiais.</p>
                  <Input value={adsInterstitialCooldown} onChange={(e) => setAdsInterstitialCooldown(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
            )}

            <Separator className="my-2" />
            <p className="text-xs font-semibold text-foreground pt-2 pb-1">Exibição e Limites</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Máximo de Anúncios por Página</label>
                <Input type="number" value={adsMaxPerPage} onChange={(e) => setAdsMaxPerPage(e.target.value)} className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Número máximo de anúncios exibidos em uma única página.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Duração Máxima da Campanha (dias)</label>
                <Input type="number" value={adsMaxDuration} onChange={(e) => setAdsMaxDuration(e.target.value)} className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Duração máxima de uma campanha de anúncios.</p>
              </div>
            </div>

            <Separator className="my-2" />
            <p className="text-xs font-semibold text-foreground pt-2 pb-1">Preço e Receita</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Orçamento Mínimo ($)</label>
                <Input type="number" value={adsMinBudget} onChange={(e) => setAdsMinBudget(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Custo Por Impressão ($)</label>
                <Input type="number" step="0.001" value={adsCostPerImpression} onChange={(e) => setAdsCostPerImpression(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Custo Por Clique ($)</label>
                <Input type="number" step="0.01" value={adsCostPerClick} onChange={(e) => setAdsCostPerClick(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5 max-w-xs pt-2">
              <label className="text-xs font-medium text-foreground">Divisão de Receita (%)</label>
              <Input type="number" value={adsRevenueShare} onChange={(e) => setAdsRevenueShare(e.target.value)} className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground">Porcentagem da receita de anúncios compartilhada com os criadores de conteúdo.</p>
            </div>

            <Separator className="my-2" />
            <p className="text-xs font-semibold text-foreground pt-2 pb-1">Opções de Direcionamento</p>
            <SettingToggle label="Direcionamento por Idade" description="Permitir que os anunciantes direcionem aos usuários por faixa etária." checked={adsTargetingAge} onCheckedChange={setAdsTargetingAge} />
            <SettingToggle label="Direcionamento por Gênero" description="Permitir que os anunciantes direcionem aos usuários por gênero." checked={adsTargetingGender} onCheckedChange={setAdsTargetingGender} />
            <SettingToggle label="Direcionamento por Localização" description="Permitir que os anunciantes direcionem aos usuários por localização geográfica." checked={adsTargetingLocation} onCheckedChange={setAdsTargetingLocation} />
            <SettingToggle label="Direcionamento por Interesses" description="Permitir que os anunciantes direcionem aos usuários com base em seus interesses e atividades." checked={adsTargetingInterests} onCheckedChange={setAdsTargetingInterests} />

            <Separator className="my-2" />
            <p className="text-xs font-semibold text-foreground pt-2 pb-1">Moderação e Políticas</p>
            <SettingToggle label="Permitir que Usuários Criem Anúncios" description="Permitir que usuários comuns criem e gerenciem suas próprias campanhas de anúncios." checked={adsUserCreateEnabled} onCheckedChange={setAdsUserCreateEnabled} />
            <SettingToggle label="Aprovar Anúncios Automaticamente" description="Aprovar automaticamente novas campanhas de anúncios sem a revisão do administrador." checked={adsAutoApprove} onCheckedChange={setAdsAutoApprove} />
            <SettingToggle label="Filtro de Conteúdo NSFW" description="Rejeitar automaticamente conteúdos de anúncios sinalizados como inadequados ou NSFW." checked={adsNsfwFilter} onCheckedChange={setAdsNsfwFilter} />
          </>
        )}
      </SettingsSection>

      {adsEnabled && (
        <SettingsSection title="Integração com o Google AdSense" description="Exibir anúncios do Google AdSense ao lado de anúncios nativos." icon={BarChart3}>
          <SettingToggle label="Ativar Google AdSense" description="Exibir anúncios do Google AdSense no seu site. Requer uma conta AdSense aprovada." checked={adsGoogleAdsense} onCheckedChange={setAdsGoogleAdsense} />
          {adsGoogleAdsense && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">ID do Editor</label>
                <Input value={adsensePublisherId} onChange={(e) => setAdsensePublisherId(e.target.value)} placeholder="ca-pub-XXXXXXXXXXXXXXXX" className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Seu ID de editor do Google AdSense, encontrado no painel do AdSense.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bloco de Anúncio do Cabeçalho</label>
                <Input value={adsenseHeaderSlot} onChange={(e) => setAdsenseHeaderSlot(e.target.value)} placeholder="1234567890" className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">ID do bloco de anúncios para o posicionamento do cabeçalho.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bloco de Anúncio da Barra Lateral</label>
                <Input value={adsenseSidebarSlot} onChange={(e) => setAdsenseSidebarSlot(e.target.value)} placeholder="1234567890" className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">ID do bloco de anúncios para o posicionamento da barra lateral.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bloco de Anúncio no Feed</label>
                <Input value={adsenseFeedSlot} onChange={(e) => setAdsenseFeedSlot(e.target.value)} placeholder="1234567890" className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">ID do bloco de anúncios para o posicionamento no feed.</p>
              </div>
            </div>
          )}
        </SettingsSection>
      )}

      <SettingsSection title="Gerenciar Categorias" description="Adicione, remova e organize categorias para o marketplace, grupos, páginas e eventos." icon={Tag}>
        <div className="flex gap-1 mb-3">
          {[
            { key: "marketplace", label: "Marketplace", icon: Store },
            { key: "groups", label: "Grupos", icon: Users },
            { key: "pages", label: "Páginas", icon: LayoutGrid },
            { key: "events", label: "Eventos", icon: Calendar },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeCategoryTab === tab.key ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setActiveCategoryTab(tab.key)}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </Button>
          ))}
        </div>

        {(() => {
          const categoryMap: Record<string, { get: string[]; set: React.Dispatch<React.SetStateAction<string[]>> }> = {
            marketplace: { get: marketplaceCategories, set: setMarketplaceCategories },
            groups: { get: groupCategories, set: setGroupCategories },
            pages: { get: pageCategories, set: setPageCategories },
            events: { get: eventCategories, set: setEventCategories },
          };
          const current = categoryMap[activeCategoryTab];
          const addCategory = () => {
            if (newCategory.trim() && !current.get.includes(newCategory.trim())) {
              current.set([...current.get, newCategory.trim()]);
              setNewCategory("");
            }
          };
          const removeCategory = (cat: string) => {
            current.set(current.get.filter((c) => c !== cat));
          };

          return (
            <>
              <div className="flex gap-2 max-w-md">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-9 text-sm"
                  placeholder={
                    activeCategoryTab === "marketplace" ? "Adicionar nova categoria de marketplace..." :
                    activeCategoryTab === "groups" ? "Adicionar nova categoria de grupo..." :
                    activeCategoryTab === "pages" ? "Adicionar nova categoria de página..." :
                    "Adicionar nova categoria de evento..."
                  }
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <Button size="sm" className="gap-1 shrink-0" onClick={addCategory}>
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {current.get.map((cat) => (
                  <Badge key={cat} variant="secondary" className="gap-1 pr-1 text-xs">
                    {cat}
                    <button
                      onClick={() => removeCategory(cat)}
                      className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{current.get.length} categorias configuradas</p>
            </>
          );
        })()}
      </SettingsSection>
      </>
      )}

      {/* ── Payments Tab ── */}
      {activeTab === "payments" && (
        <>
      {/* Payment Configuration */}
      <SettingsSection title="Configuração de Pagamento" description="Configure gateways de pagamento, assinaturas Pro e sistema de carteira." icon={DollarSign}>
        <SettingToggle label="Sistema de Pagamento" description="Ativar ou desativar todo o sistema de pagamento no seu site." checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />

        {paymentEnabled && (
          <>
            <Separator className="my-2" />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Moeda Padrão</label>
                <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                  <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "CAD", "AUD", "INR", "BRL", "JPY", "TRY"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Gateway de Pagamento Padrão</label>
                <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                  <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="coinbase">Coinbase (Cripto)</SelectItem>
                    <SelectItem value="bank">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </SettingsSection>

      {paymentEnabled && (
        <>
          {/* Stripe */}
          <SettingsSection title="Configuração do Stripe" icon={CreditCard}>
            <SettingToggle label="Ativar Stripe" description="Aceitar pagamentos com cartão de crédito/débito via Stripe." checked={stripeEnabled} onCheckedChange={setStripeEnabled} />
            {stripeEnabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Chave Pública (Publishable Key)</label>
                  <Input value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} placeholder="pk_live_..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Chave Secreta (Secret Key)</label>
                  <Input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} placeholder="sk_live_..." className="h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">A chave secreta não é exibida por motivos de segurança, mas você ainda pode substituir a atual.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Segredo do Webhook</label>
                  <Input type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} placeholder="whsec_..." className="h-9 text-sm" />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* PayPal */}
          <SettingsSection title="Configuração do PayPal" icon={Wallet}>
            <SettingToggle label="Ativar PayPal" description="Aceitar pagamentos via checkout do PayPal." checked={paypalEnabled} onCheckedChange={setPaypalEnabled} />
            {paypalEnabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Modo</label>
                  <Select value={paypalMode} onValueChange={setPaypalMode}>
                    <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="live">Live (Produção)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">ID do Cliente (Client ID)</label>
                  <Input value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="Seu PayPal Client ID" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Segredo do Cliente (Client Secret)</label>
                  <Input type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)} placeholder="Seu PayPal Client Secret" className="h-9 text-sm" />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* Razorpay */}
          <SettingsSection title="Configuração do Razorpay" icon={Banknote}>
            <SettingToggle label="Ativar Razorpay" description="Aceitar pagamentos via Razorpay (popular na Índia)." checked={razorpayEnabled} onCheckedChange={setRazorpayEnabled} />
            {razorpayEnabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">ID da Chave (Key ID)</label>
                  <Input value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Segredo da Chave (Key Secret)</label>
                  <Input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="Seu Razorpay Key Secret" className="h-9 text-sm" />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* Coinbase */}
          <SettingsSection title="Coinbase Commerce (Cripto)" icon={Bitcoin}>
            <SettingToggle label="Ativar Pagamentos em Cripto" description="Aceitar pagamentos em criptomoeda via Coinbase Commerce." checked={coinbaseEnabled} onCheckedChange={setCoinbaseEnabled} />
            {coinbaseEnabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Chave de API</label>
                  <Input type="password" value={coinbaseApiKey} onChange={(e) => setCoinbaseApiKey(e.target.value)} placeholder="Sua Coinbase API Key" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Segredo Compartilhado do Webhook</label>
                  <Input type="password" value={coinbaseWebhookSecret} onChange={(e) => setCoinbaseWebhookSecret(e.target.value)} placeholder="Seu Coinbase Webhook Secret" className="h-9 text-sm" />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* Bank Transfer */}
          <SettingsSection title="Transferência Bancária" icon={Banknote}>
            <SettingToggle label="Ativar Transferência Bancária" description="Permitir que os usuários paguem via transferência bancária manual." checked={bankTransferEnabled} onCheckedChange={setBankTransferEnabled} />
            {bankTransferEnabled && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">Instruções de Pagamento</label>
                <Textarea value={bankTransferInstructions} onChange={(e) => setBankTransferInstructions(e.target.value)} placeholder="Insira os dados bancários e as instruções de pagamento para os usuários..." className="text-sm min-h-[80px]" />
                <p className="text-[10px] text-muted-foreground">Estas instruções serão exibidas aos usuários que selecionarem a transferência bancária como método de pagamento.</p>
              </div>
            )}
          </SettingsSection>

          {/* Pro Membership */}
          <SettingsSection title="Sistema de Assinatura Pro" description="Configure planos de assinatura premium e preços." icon={Crown}>
            <SettingToggle label="Sistema Pro" description="Ativar o sistema de assinatura Pro, permitindo que os usuários assinem recursos premium." checked={proSystem} onCheckedChange={setProSystem} />
            {proSystem && (
              <div className="space-y-3 pt-2">
                <Separator className="my-1" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Preço Mensal ($)</label>
                    <Input type="number" value={proMonthlyPrice} onChange={(e) => setProMonthlyPrice(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Preço Anual ($)</label>
                    <Input type="number" value={proYearlyPrice} onChange={(e) => setProYearlyPrice(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Preço Vitalício ($)</label>
                    <Input type="number" value={proLifetimePrice} onChange={(e) => setProLifetimePrice(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Defina o preço para cada plano de assinatura Pro. Deixe em branco para ocultar um plano.</p>
              </div>
            )}
          </SettingsSection>

          {/* Wallet System */}
          <SettingsSection title="Sistema de Carteira" description="Permitir que os usuários recarreguem e gerenciem o saldo de uma carteira interna." icon={Wallet}>
            <SettingToggle label="Sistema de Carteira" description="Ativar carteira interna onde os usuários podem adicionar fundos e usá-los em toda a plataforma." checked={walletSystem} onCheckedChange={setWalletSystem} />
            {walletSystem && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Recarga Mínima ($)</label>
                    <Input type="number" value={walletMinTopup} onChange={(e) => setWalletMinTopup(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Recarga Máxima ($)</label>
                    <Input type="number" value={walletMaxTopup} onChange={(e) => setWalletMaxTopup(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            )}
          </SettingsSection>
        </>
      )}
      </>
      )}

      {/* ── Mobile Apps Tab ── */}
      {activeTab === "apps" && (
        <>
          {/* PWA Configuration */}
          <SettingsSection title="Progressive Web App (PWA)" icon={MonitorSmartphone} description="Configure seu aplicativo para uma experiência web instalável no celular e no desktop.">
            <SettingToggle label="Ativar PWA" description="Permitir que os usuários instalem sua plataforma como um aplicativo nativo a partir do navegador." checked={pwaEnabled} onCheckedChange={setPwaEnabled} />
            {pwaEnabled && (
              <>
                <Separator />
                <div className="py-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Nome do Aplicativo</label>
                      <p className="text-xs text-muted-foreground mb-1.5">Nome completo exibido durante a instalação.</p>
                      <Input value={pwaAppName} onChange={(e) => setPwaAppName(e.target.value)} className="h-9 text-sm" placeholder="Minha Rede Social" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Nome Curto</label>
                      <p className="text-xs text-muted-foreground mb-1.5">Exibido abaixo do ícone na tela inicial.</p>
                      <Input value={pwaShortName} onChange={(e) => setPwaShortName(e.target.value)} className="h-9 text-sm" placeholder="MinhaRede" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Cor do Tema</label>
                      <p className="text-xs text-muted-foreground mb-1.5">Cor da barra de ferramentas do navegador e da barra de status.</p>
                      <div className="flex items-center gap-2">
                        <input type="color" value={pwaThemeColor} onChange={(e) => setPwaThemeColor(e.target.value)} className="w-9 h-9 rounded border border-border cursor-pointer" />
                        <Input value={pwaThemeColor} onChange={(e) => setPwaThemeColor(e.target.value)} className="h-9 text-sm flex-1" placeholder="#1d4ed8" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Cor de Fundo</label>
                      <p className="text-xs text-muted-foreground mb-1.5">Cor de fundo da tela de inicialização.</p>
                      <div className="flex items-center gap-2">
                        <input type="color" value={pwaBackgroundColor} onChange={(e) => setPwaBackgroundColor(e.target.value)} className="w-9 h-9 rounded border border-border cursor-pointer" />
                        <Input value={pwaBackgroundColor} onChange={(e) => setPwaBackgroundColor(e.target.value)} className="h-9 text-sm flex-1" placeholder="#ffffff" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <SettingToggle label="Modo Offline" description="Armazenar recursos em cache para que o aplicativo funcione sem conexão com a internet." checked={pwaOfflineMode} onCheckedChange={setPwaOfflineMode} />
                  <Separator />
                  <SettingToggle label="Notificações Push" description="Enviar notificações push aos usuários que instalaram o PWA." checked={pwaPushNotifications} onCheckedChange={setPwaPushNotifications} />
                  <Separator />
                  <SettingToggle label="Aviso de Instalação" description="Exibir um banner de instalação personalizado incentivando os usuários a adicionar o aplicativo à tela inicial." checked={pwaInstallPrompt} onCheckedChange={setPwaInstallPrompt} />
                </div>
              </>
            )}
          </SettingsSection>

          {/* Android & iOS Apps */}
          <SettingsSection title="Aplicativos Android & iOS" icon={Smartphone} description="Links de aplicativos nativos para plataformas móveis e desktop">
            <div className="py-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Android Messenger Nativo</label>
                  <p className="text-xs text-muted-foreground mb-1.5">Link do seu aplicativo Android Messenger Nativo.</p>
                  <Input value={androidMessenger} onChange={(e) => setAndroidMessenger(e.target.value)} className="h-9 text-sm" placeholder="https://play.google.com/..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Android Timeline Nativo</label>
                  <p className="text-xs text-muted-foreground mb-1.5">Link do seu aplicativo Android Timeline Nativo.</p>
                  <Input value={androidTimeline} onChange={(e) => setAndroidTimeline(e.target.value)} className="h-9 text-sm" placeholder="https://play.google.com/..." />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">iOS Messenger Nativo</label>
                  <p className="text-xs text-muted-foreground mb-1.5">Link do seu aplicativo iOS Messenger Nativo.</p>
                  <Input value={iosMessenger} onChange={(e) => setIosMessenger(e.target.value)} className="h-9 text-sm" placeholder="https://apps.apple.com/..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">iOS Timeline Nativo</label>
                  <p className="text-xs text-muted-foreground mb-1.5">Link do seu aplicativo iOS Timeline Nativo.</p>
                  <Input value={iosTimeline} onChange={(e) => setIosTimeline(e.target.value)} className="h-9 text-sm" placeholder="https://apps.apple.com/..." />
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-foreground">Windows Messenger Nativo</label>
                <p className="text-xs text-muted-foreground mb-1.5">Link do seu aplicativo Windows Messenger Nativo.</p>
                <Input value={windowsMessenger} onChange={(e) => setWindowsMessenger(e.target.value)} className="h-9 text-sm max-w-md" placeholder="https://microsoft.com/..." />
              </div>
            </div>
          </SettingsSection>
        </>
      )}

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Todas as Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
