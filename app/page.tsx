"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

// 模擬專案數據
const mockProjects = [
  { id: 1, name: "台北市公寓專案", rooms: 5, lastUpdated: "2025-03-20" },
  { id: 2, name: "新北市別墅專案", rooms: 8, lastUpdated: "2025-03-15" },
  { id: 3, name: "桃園市辦公室專案", rooms: 12, lastUpdated: "2025-03-10" },
]

export default function Dashboard() {
  const [projects, setProjects] = useState(mockProjects)
  const [newProjectName, setNewProjectName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return

    const newProject = {
      id: projects.length + 1,
      name: newProjectName,
      rooms: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
    }

    setProjects([...projects, newProject])
    setNewProjectName("")
    setIsDialogOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 側邊欄 */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white">
        <div className="flex items-center h-16 px-4 border-b">
          <h1 className="text-lg font-semibold">家具識別系統</h1>
        </div>
        <div className="flex-1 overflow-auto py-4 px-3">
          <div className="space-y-1">
            <Link href="/" className="flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100">
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
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">最後更新: {project.lastUpdated}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">{project.rooms}</span> 個房間
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        查看詳情
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="h-full border-dashed hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center py-8">
                  <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-medium">新增專案</p>
                </Card>
              </DialogTrigger>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}

