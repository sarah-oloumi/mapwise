import { NavLink } from "react-router-dom";
import { MapPin, Navigation, Newspaper, User } from "lucide-react";

const BottomNavigation = () => {
  const navItems = [
    { to: "/", icon: MapPin, label: "Main" },
    { to: "/nearby", icon: Navigation, label: "Nearby" },
    { to: "/news", icon: Newspaper, label: "News" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;