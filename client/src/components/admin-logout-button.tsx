import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLogoutButton() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="w-full justify-start text-sidebar-text hover:text-sidebar-text hover:bg-sidebar-hover"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  );
}