import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLogoutButton() {
  const { isAdmin } = useAdminAuth();

  const handleLogout = () => {
    if (isAdmin) {
      window.location.href = "/api/auth/logout";
    } else {
      window.location.href = "/api/logout";
    }
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