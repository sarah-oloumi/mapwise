import { Settings, User, MapPin, Bell, Heart, HelpCircle, LogOut } from "lucide-react";

const ProfilePage = () => {
  const menuItems = [
    { icon: User, label: "Edit Profile", description: "Update your personal information" },
    { icon: MapPin, label: "Location Settings", description: "Manage location preferences" },
    { icon: Bell, label: "Notifications", description: "Configure alert preferences" },
    { icon: Heart, label: "Saved Places", description: "View your favorite locations" },
    { icon: HelpCircle, label: "Help & Support", description: "Get assistance and FAQ" },
    { icon: Settings, label: "App Settings", description: "Customize app behavior" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <Settings className="w-6 h-6 text-muted-foreground" />
      </header>

      {/* Profile Section */}
      <div className="p-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-1">John Doe</h2>
          <p className="text-sm text-muted-foreground mb-4">Explorer since 2024</p>
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">127</p>
              <p className="text-xs text-muted-foreground">Places Visited</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">89</p>
              <p className="text-xs text-muted-foreground">Voice Queries</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">23</p>
              <p className="text-xs text-muted-foreground">Saved Spots</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 px-4 pb-20 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="w-full bg-card rounded-xl shadow-sm border border-border p-4 flex items-center gap-4 text-left hover:bg-card/80 transition-colors"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="mt-6">
          <button className="w-full bg-destructive/10 text-destructive rounded-xl p-4 flex items-center justify-center gap-2 font-medium hover:bg-destructive/20 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;