import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, LogOut, Users, Shield } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import DashboardFooter from "@/components/DashboardFooter";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      navigate(`/${roleData?.role || "auth"}`);
      return;
    }

    setUser(user);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles and user_roles separately since there's no FK relationship
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast({
        title: "Error",
        description: "Failed to fetch user roles",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Combine profiles with their roles
    const usersWithRoles = (profilesData || []).map(profile => {
      const userRole = rolesData?.find(r => r.user_id === profile.id);
      return {
        ...profile,
        user_roles: userRole ? [{ role: userRole.role }] : []
      };
    });

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Delete existing roles for this user
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as any }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive text-destructive-foreground">Admin</Badge>;
      case "staff":
        return <Badge className="bg-primary text-primary-foreground">Staff</Badge>;
      case "student":
        return <Badge variant="secondary">Student</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BrotoCare</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">User Management</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <Card className="shadow-elegant border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">There are no users to display</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((userData) => {
              const currentRole = userData.user_roles?.[0]?.role || "student";
              return (
                <Card key={userData.id} className="shadow-elegant border-border/50">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                          {userData.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{userData.full_name}</CardTitle>
                          <CardDescription>{userData.email}</CardDescription>
                        </div>
                      </div>
                      {getRoleBadge(currentRole)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={currentRole}
                        onValueChange={(value) => handleRoleChange(userData.id, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
