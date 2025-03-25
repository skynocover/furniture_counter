'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Database } from '@/types/supabase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// 引入Supabase相關函數
import { adminGetProjects, adminAddProject, adminDeleteProject } from '@/utils/db-server';

export default function Dashboard() {
  const [projects, setProjects] = useState<Database['public']['Tables']['projects']['Row'][]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 獲取項目資料
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const projectsData = await adminGetProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 建立新項目
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const newProject = await adminAddProject({
        name: newProjectName,
      });

      setProjects([newProject, ...projects]);
      setNewProjectName('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 側邊欄 */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white">
        <div className="flex items-center h-16 px-4 border-b">
          <h1 className="text-lg font-semibold">家具識別系統</h1>
        </div>
        <div className="flex-1 overflow-auto py-4 px-3">
          <div className="space-y-1">
            <Link
              href="/"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100"
            >
              專案管理
            </Link>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6">
          <h1 className="text-lg font-semibold md:hidden">家具識別系統</h1>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">專案管理</h2>
            <p className="text-muted-foreground">管理您的房間PDF和家具識別專案</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p>載入中...</p>
            ) : (
              <>
                {projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle>{project.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground mb-4">
                          最後更新: {new Date(project.updated_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="h-full border-dashed hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center py-8">
                  <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-medium">新增專案</p>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增專案</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="project-name">專案名稱</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="輸入專案名稱"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline">
                    取消
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                    建立
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
