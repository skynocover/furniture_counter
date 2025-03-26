'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Upload, Save, Pencil, Check, X, Trash } from 'lucide-react';
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
  adminDeleteRoom,
} from '@/utils/db-server';
import { uploadFileToSupabase } from '@/utils/upload-helper';
import { ParseFurniture } from '@/utils/gemini';

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
  const [editTypeValue, setEditTypeValue] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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
    try {
      setAddingRoom(true);
      let pdfUrl = '';
      let roomName = newRoomName.trim();

      if (pdfFile) {
        // 上傳文件到 Supabase 存儲
        pdfUrl = await uploadFileToSupabase(pdfFile, `projects/${id}/rooms`);

        // 如果房間名稱為空，則使用PDF檔案名稱
        if (!roomName) {
          // 移除副檔名
          roomName = pdfFile.name.replace(/\.[^/.]+$/, '');
        }
      }

      // 檢查名稱是否還是為空，若為空則中斷
      if (!roomName) {
        alert('請輸入房間名稱或上傳檔案');
        setAddingRoom(false);
        return;
      }

      const furniture: any = await ParseFurniture({
        fileUrl: pdfUrl,
        fileName: pdfFile?.name || '',
        roomId: Number(id),
      });

      const newRoom = await adminAddRoom({
        project_id: Number(id),
        name: roomName,
        pdf_url: pdfUrl || '',
        furnitures: furniture,
      });

      setRooms([...rooms, newRoom]);
      setNewRoomName('');
      setIsDialogOpen(false);
      setPdfFile(null);
    } catch (error) {
      console.error('Failed to add room:', error);
    } finally {
      setAddingRoom(false);
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

  const handleEditFurniture = async (
    roomId: number,
    furnitureId: number,
    newCount: number,
    newType: string,
  ) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const updatedFurniture = room.furnitures.map((item: any, index: number) =>
        index === furnitureId ? { ...item, count: newCount, type: newType } : item,
      );

      await adminUpdateRoom(roomId, { furnitures: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furnitures: updatedFurniture } : r)));

      setEditingFurniture(null);
    } catch (error) {
      console.error('Failed to update furniture:', error);
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

  const handleDeleteRoom = async (roomId: number) => {
    try {
      await adminDeleteRoom(roomId);

      // 更新本地狀態，移除已刪除的房間
      setRooms(rooms.filter((room) => room.id !== roomId));

      // 如果當前在被刪除的房間標籤頁，則切換到總覽標籤
      if (activeTab === `room-${roomId}`) {
        setActiveTab('overview');
      }

      // 重置確認刪除狀態
      setConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  const handleAddFurniture = async (roomId: number) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      // 創建新的家具項目
      const newFurniture = {
        id: Date.now(), // 臨時ID，實際上後端可能會重新分配
        type: '新家具',
        count: 1,
      };

      const updatedFurniture = [newFurniture, ...room.furnitures];

      await adminUpdateRoom(roomId, { furnitures: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furnitures: updatedFurniture } : r)));
    } catch (error) {
      console.error('Failed to add furniture:', error);
    }
  };

  const handleDeleteFurniture = async (roomId: number, furnitureId: number) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const updatedFurniture = room.furnitures.filter(
        (item: any, index: number) => index !== furnitureId,
      );

      await adminUpdateRoom(roomId, { furnitures: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furnitures: updatedFurniture } : r)));
    } catch (error) {
      console.error('Failed to delete furniture:', error);
    }
  };

  const startEditingFurniture = (
    roomId: number,
    furnitureId: number,
    currentCount: number,
    currentType: string,
  ) => {
    setEditingFurniture({ roomId, furnitureId });
    setEditValue(currentCount.toString());
    setEditTypeValue(currentType);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center">找不到專案</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 主內容區 */}
      <div className="flex-1 ">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">返回專案列表</Button>
            </Link>
          </div>
        </header>

        <main className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
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
                      disabled={(!newRoomName.trim() && !pdfFile) || addingRoom}
                    >
                      {addingRoom ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          處理中...
                        </div>
                      ) : (
                        '新增房間'
                      )}
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
                        {room.furnitures.reduce((sum: number, item: any) => sum + item.count, 0)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.furnitures.map((item: any, index: number) => (
                          <div key={index} className="text-xs bg-muted px-2 py-1 rounded-full">
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
              <TabsContent key={room.id} value={`room-${room.id}`} className="space-y-2">
                <div className="grid gap-2 grid-cols-12">
                  <Card className="col-span-9">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex items-center justify-between w-full">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingRoom(null)}
                              >
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
                            </label>

                            {confirmDelete === room.id ? (
                              <>
                                <Button
                                  onClick={() => handleDeleteRoom(room.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  確認
                                </Button>
                                <Button
                                  onClick={() => setConfirmDelete(null)}
                                  variant="outline"
                                  size="sm"
                                >
                                  取消
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => setConfirmDelete(room.id)}
                                variant="outline"
                                size="sm"
                                className="gap-1 text-red-500 hover:text-red-600"
                              >
                                <Trash className="h-4 w-4" />
                                刪除
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="border rounded-lg overflow-hidden">
                        <iframe
                          src={room.pdf_url}
                          className="w-full h-[740px]"
                          title={`${room.name} PDF`}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-3">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="flex justify-between items-center">
                        <span>家具清單</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddFurniture(room.id)}
                          className="gap-1"
                        >
                          <PlusCircle className="h-4 w-4" />
                          新增家具
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[740px] overflow-y-auto">
                          <table className="w-full">
                            <thead className="sticky top-0 bg-background z-10">
                              <tr className="bg-muted border-b">
                                <th className="text-left p-3">家具類型</th>
                                <th className="text-center p-3">數量</th>
                                <th className="text-right p-3">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {room.furnitures.map((item: any, index: number) => (
                                <tr key={index} className="border-b last:border-0">
                                  <td className="p-3">
                                    {editingFurniture &&
                                    editingFurniture.roomId === room.id &&
                                    editingFurniture.furnitureId === index ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={editTypeValue}
                                          onChange={(e) => setEditTypeValue(e.target.value)}
                                          className="max-w-[150px]"
                                        />
                                      </div>
                                    ) : (
                                      <span>{item.type}</span>
                                    )}
                                  </td>
                                  <td className="text-center p-3">
                                    {editingFurniture &&
                                    editingFurniture.roomId === room.id &&
                                    editingFurniture.furnitureId === index ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <Input
                                          type="number"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          className="max-w-[80px]"
                                          min="0"
                                        />
                                      </div>
                                    ) : (
                                      <span>{item.count}</span>
                                    )}
                                  </td>
                                  <td className="text-right p-3">
                                    <div className="flex justify-end gap-1">
                                      {editingFurniture &&
                                      editingFurniture.roomId === room.id &&
                                      editingFurniture.furnitureId === index ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              handleEditFurniture(
                                                room.id,
                                                index,
                                                Number.parseInt(editValue) || 0,
                                                editTypeValue,
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
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              startEditingFurniture(
                                                room.id,
                                                index,
                                                item.count,
                                                item.type,
                                              )
                                            }
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDeleteFurniture(room.id, index)}
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
