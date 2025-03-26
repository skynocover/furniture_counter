'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Upload, Save, Pencil, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  adminGetProjectById,
  adminGetRooms,
  adminAddRoom,
  adminUpdateRoom,
} from '@/utils/db-server';
import { uploadFileToSupabase } from '@/utils/upload-helper';

export default function ProjectPage({ params }: any) {
  const unwrappedParams = use<{ id: string }>(params);
  const { id } = unwrappedParams;
  const [project, setProject] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newRoomName, setNewRoomName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [editingFurniture, setEditingFurniture] = useState<{
    roomId: number;
    furnitureId: number;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // 初始化數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projectData = await adminGetProjectById(Number(id));
        const roomsData = await adminGetRooms(Number(id));

        setProject(projectData);
        setRooms(roomsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 計算所有家具的總數
  const furnitureTotals: any = rooms.reduce((acc, room) => {
    if (room.furniture) {
      room.furniture.forEach((item: any) => {
        if (!acc[item.type]) {
          acc[item.type] = 0;
        }
        acc[item.type] += item.count;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      let pdfUrl = null;

      if (pdfFile) {
        // 上傳文件到 Supabase 存儲
        pdfUrl = await uploadFileToSupabase(pdfFile, `projects/${id}/rooms`);
      }

      const newRoom = await adminAddRoom({
        project_id: Number(id),
        name: newRoomName,
        pdf_url: pdfUrl || '',
        furnitures: [],
      });

      setRooms([...rooms, newRoom]);
      setNewRoomName('');
      setIsDialogOpen(false);
      setPdfFile(null);
    } catch (error) {
      console.error('Failed to add room:', error);
    }
  };

  const handleEditRoomName = async (roomId: number, newName: string) => {
    try {
      await adminUpdateRoom(roomId, { name: newName });

      setRooms(rooms.map((room) => (room.id === roomId ? { ...room, name: newName } : room)));

      setEditingRoom(null);
    } catch (error) {
      console.error('Failed to update room name:', error);
    }
  };

  const handleEditFurnitureCount = async (
    roomId: number,
    furnitureId: number,
    newCount: number,
  ) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const updatedFurniture = room.furnitures.map((item: any) =>
        item.id === furnitureId ? { ...item, count: newCount } : item,
      );

      await adminUpdateRoom(roomId, { furnitures: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furnitures: updatedFurniture } : r)));

      setEditingFurniture(null);
    } catch (error) {
      console.error('Failed to update furniture count:', error);
    }
  };

  const handleUploadPdf = async (roomId: number, file: File) => {
    try {
      const pdfUrl = await uploadFileToSupabase(file, `projects/${id}/rooms`);
      await adminUpdateRoom(roomId, { pdf_url: pdfUrl });

      setRooms(rooms.map((room) => (room.id === roomId ? { ...room, pdf_url: pdfUrl } : room)));
    } catch (error) {
      console.error('Failed to upload PDF:', error);
    }
  };

  const startEditingFurniture = (roomId: number, furnitureId: number, currentCount: number) => {
    setEditingFurniture({ roomId, furnitureId });
    setEditValue(currentCount.toString());
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center">找不到專案</div>;
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
            <Link
              href="/"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              專案管理
            </Link>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">返回專案列表</Button>
            </Link>
          </div>
        </header>

        <main className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="overview">總覽</TabsTrigger>
                <TabsTrigger value="analysis">分析結果</TabsTrigger>
                {rooms.map((room) => (
                  <TabsTrigger key={room.id} value={`room-${room.id}`}>
                    {room.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    新增房間
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增房間</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="room-name">房間名稱</Label>
                      <Input
                        id="room-name"
                        placeholder="輸入房間名稱"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="room-pdf">上傳PDF文件</Label>
                      <Input
                        id="room-pdf"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPdfFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAddRoom}
                      disabled={!newRoomName.trim()}
                    >
                      新增房間
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>家具總計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="text-left p-3">家具類型</th>
                          <th className="text-center p-3">總數量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(furnitureTotals).map(([type, count], index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="p-3">{type}</td>
                            {/* <td className="text-center p-3">{count} 件</td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <Card key={room.id} className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-center">
                        <span>{room.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveTab(`room-${room.id}`);
                          }}
                        >
                          查看
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-2">
                        家具數量:{' '}
                        {room.furnitures.reduce((sum: number, item: any) => sum + item.count, 0)}件
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.furnitures.map((item: any) => (
                          <div key={item.id} className="text-xs bg-muted px-2 py-1 rounded-full">
                            {item.type}: {item.count}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {rooms.map((room) => (
              <TabsContent key={room.id} value={`room-${room.id}`} className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      {editingRoom === room.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="max-w-[200px]"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRoomName(room.id, editValue)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingRoom(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{room.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingRoom(room.id);
                              setEditValue(room.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadPdf(room.id, e.target.files[0]);
                              }
                            }}
                          />
                          <Button variant="outline" size="sm" className="gap-1">
                            <Upload className="h-4 w-4" />
                            更新PDF
                          </Button>
                        </label>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Save className="h-4 w-4" />
                          儲存變更
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        房間PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <iframe
                          src={room.pdf_url || '/placeholder.svg?height=800&width=600'}
                          className="w-full h-[500px]"
                          title={`${room.name} PDF`}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>家具清單</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted border-b">
                              <th className="text-left p-3">家具類型</th>
                              <th className="text-center p-3">數量</th>
                              <th className="text-right p-3">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {room.furnitures.map((item: any) => (
                              <tr key={item.id} className="border-b last:border-0">
                                <td className="p-3">{item.type}</td>
                                <td className="text-center p-3">
                                  {editingFurniture &&
                                  editingFurniture.roomId === room.id &&
                                  editingFurniture.furnitureId === item.id ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="max-w-[80px]"
                                        min="0"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleEditFurnitureCount(
                                            room.id,
                                            item.id,
                                            Number.parseInt(editValue) || 0,
                                          )
                                        }
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingFurniture(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span>{item.count} 件</span>
                                  )}
                                </td>
                                <td className="text-right p-3">
                                  {!(
                                    editingFurniture &&
                                    editingFurniture.roomId === room.id &&
                                    editingFurniture.furnitureId === item.id
                                  ) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        startEditingFurniture(room.id, item.id, item.count)
                                      }
                                    >
                                      編輯
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
            <TabsContent value="analysis" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>家具分析結果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">總家具數量</div>
                      <div className="text-2xl font-bold">
                        {/* {Object.values(furnitureTotals).reduce(
                          (sum: number, count: number) => sum + count,
                          0,
                        )} */}
                        件
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">家具種類</div>
                      <div className="text-2xl font-bold">
                        {Object.keys(furnitureTotals).length} 種
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">房間數量</div>
                      <div className="text-2xl font-bold">{rooms.length} 間</div>
                    </div>
                  </div>

                  <div className="h-[400px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(furnitureTotals).map(([type, count]) => ({
                          type,
                          count,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" angle={-45} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="數量" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="text-left p-3">家具類型</th>
                          <th className="text-center p-3">總數量</th>
                          <th className="text-right p-3">佔比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* {Object.entries(furnitureTotals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count], index) => {
                            const total = Object.values(furnitureTotals).reduce(
                              (sum, count) => sum + count,
                              0,
                            );
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <tr key={index} className="border-b last:border-0">
                                <td className="p-3">{type}</td>
                                <td className="text-center p-3">{count} 件</td>
                                <td className="text-right p-3">{percentage}%</td>
                              </tr>
                            );
                          })} */}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
