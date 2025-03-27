'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { PlusCircle, Pencil, Check, X, Trash, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Database } from '@/types/supabase';

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
  adminUpdateProject,
  adminDeleteProject,
} from '@/utils/db-server';
import { uploadFileToSupabase } from '@/utils/upload-helper';
import { ParseFurniture, ParseFloorMapping } from '@/utils/gemini';

// Add Floor Mapping interface
interface FloorMapping {
  name: string;
  total: number;
  floors: {
    name: string;
    count: number;
  }[];
}

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
  const [showChart, setShowChart] = useState(false);
  const [showFloorMapping, setShowFloorMapping] = useState(false);
  const [floorMappingFile, setFloorMappingFile] = useState<File | null>(null);
  const [processingFloorMapping, setProcessingFloorMapping] = useState(false);
  const [floorMappingDialogOpen, setFloorMappingDialogOpen] = useState(false);
  const [floorMappingData, setFloorMappingData] = useState<FloorMapping[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  // Add state for viewing floor mapping image
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState(false);

  // Add state for tracking which cell is being edited
  const [editingFloorCell, setEditingFloorCell] = useState<{
    type: 'floor' | 'roomType' | 'count';
    floorIndex?: number;
    roomTypeIndex?: number;
    value: string;
  } | null>(null);

  // Add effect to show warning when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    }
  }, [hasUnsavedChanges]);

  // Add beforeunload event listener to warn when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // 初始化數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projectData = await adminGetProjectById(Number(id));
        const roomsData = await adminGetRooms(Number(id));

        setProject(projectData);
        setRooms(roomsData);

        // Check if project has floor_mapping data
        if (projectData.floor_mapping) {
          setFloorMappingData(projectData.floor_mapping as unknown as FloorMapping[]);
          setShowFloorMapping(true);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 計算所有家具的總數
  const furnitureTotals: Record<string, number> = rooms.reduce((acc, room) => {
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
      });

      const newRoom = await adminAddRoom({
        project_id: Number(id),
        name: roomName,
        pdf_url: pdfUrl || '',
        furniture: furniture,
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

      const updatedFurniture = room.furniture.map((item: any, index: number) =>
        index === furnitureId ? { ...item, count: newCount, type: newType } : item,
      );

      await adminUpdateRoom(roomId, { furniture: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furniture: updatedFurniture } : r)));

      setEditingFurniture(null);
    } catch (error) {
      console.error('Failed to update furniture:', error);
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

      const updatedFurniture = [newFurniture, ...room.furniture];

      await adminUpdateRoom(roomId, { furniture: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furniture: updatedFurniture } : r)));
    } catch (error) {
      console.error('Failed to add furniture:', error);
    }
  };

  const handleDeleteFurniture = async (roomId: number, furnitureId: number) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const updatedFurniture = room.furniture.filter(
        (item: any, index: number) => index !== furnitureId,
      );

      await adminUpdateRoom(roomId, { furniture: updatedFurniture });

      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, furniture: updatedFurniture } : r)));
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

  const handleFloorMappingUpload = async () => {
    if (!floorMappingFile) return;

    try {
      setProcessingFloorMapping(true);

      const picUrl = await uploadFileToSupabase(
        floorMappingFile,
        `projects/${id}/rooms`,
        'room mix.png',
      );

      // Get floor mapping data from AI analysis
      const floorMapping = await ParseFloorMapping({
        fileUrl: picUrl,
        fileName: floorMappingFile.name,
      });

      // Update project with new floor mapping
      await adminUpdateProject(Number(id), { floor_mapping: floorMapping });

      // Update local state
      setFloorMappingData(floorMapping);
      setFloorMappingDialogOpen(false);
      setShowFloorMapping(true);
    } catch (error) {
      console.error('Failed to process floor mapping:', error);
    } finally {
      setProcessingFloorMapping(false);
      setFloorMappingFile(null);
    }
  };

  // Add function to handle floor or room type name edits
  const handleFloorOrRoomTypeEdit = (
    type: 'floor' | 'roomType',
    index: number,
    newValue: string,
  ) => {
    if (newValue.trim() === '') return;
    if (!floorMappingData) return;

    if (type === 'floor') {
      // Update floor name in all room types
      const updatedData = floorMappingData.map((roomType) => {
        const updatedFloors = [...roomType.floors];
        updatedFloors[index] = { ...updatedFloors[index], name: newValue };
        return {
          ...roomType,
          floors: updatedFloors,
        };
      });

      setFloorMappingData(updatedData);
    } else {
      // Update room type name
      const updatedData = [...floorMappingData];
      updatedData[index] = {
        ...updatedData[index],
        name: newValue,
      };

      setFloorMappingData(updatedData);
    }

    setEditingFloorCell(null);
    setHasUnsavedChanges(true);
  };

  // Add function to handle room count edits
  const handleRoomCountEdit = (floorIndex: number, roomTypeIndex: number, newValue: string) => {
    if (!floorMappingData) return;

    const numValue = parseInt(newValue);
    if (isNaN(numValue) || numValue < 0) return;

    // Update the count value for the specific room type and floor
    const updatedData = [...floorMappingData];
    updatedData[roomTypeIndex] = {
      ...updatedData[roomTypeIndex],
      floors: updatedData[roomTypeIndex].floors.map((floor, idx) =>
        idx === floorIndex ? { ...floor, count: numValue } : floor,
      ),
    };

    // Recalculate the total for the room type
    updatedData[roomTypeIndex].total = updatedData[roomTypeIndex].floors.reduce(
      (sum, floor) => sum + floor.count,
      0,
    );

    setFloorMappingData(updatedData);
    setEditingFloorCell(null);
    setHasUnsavedChanges(true);
  };

  // Add function to add new floor
  const addNewFloor = () => {
    if (!floorMappingData || floorMappingData.length === 0) return;

    // Get the highest floor number and create a new one with a unique identifier
    const newFloorName = `new floor ${Date.now()}`;

    // Add new floor to each room type
    const updatedData = floorMappingData.map((roomType) => ({
      ...roomType,
      floors: [...roomType.floors, { name: newFloorName, count: 0 }],
    }));

    setFloorMappingData(updatedData);
    setHasUnsavedChanges(true);
  };

  // Add function to add new room type
  const addNewRoomType = () => {
    if (!floorMappingData || floorMappingData.length === 0) return;

    // Create a new room type with 0 counts for all floors and a unique identifier
    const newRoomType: FloorMapping = {
      name: `new room ${Date.now()}`,
      total: 0,
      floors: floorMappingData[0].floors.map((floor) => ({
        name: floor.name,
        count: 0,
      })),
    };

    setFloorMappingData([newRoomType, ...floorMappingData]);
    setHasUnsavedChanges(true);
  };

  // Add function to delete a floor
  const deleteFloor = (floorIndex: number) => {
    if (!floorMappingData || floorMappingData.length === 0) return;

    // Must have at least one floor
    if (floorMappingData[0].floors.length <= 1) return;

    // Remove the floor from all room types
    const updatedData = floorMappingData.map((roomType) => {
      const updatedFloors = [...roomType.floors];
      updatedFloors.splice(floorIndex, 1);

      return {
        ...roomType,
        floors: updatedFloors,
        // Recalculate the total
        total: updatedFloors.reduce((sum, floor) => sum + floor.count, 0),
      };
    });

    setFloorMappingData(updatedData);
    setHasUnsavedChanges(true);
  };

  // Add function to delete a room type
  const deleteRoomType = (roomTypeIndex: number) => {
    if (!floorMappingData) return;

    // Must have at least one room type
    if (floorMappingData.length <= 1) return;

    const updatedData = [...floorMappingData];
    updatedData.splice(roomTypeIndex, 1);

    setFloorMappingData(updatedData);
    setHasUnsavedChanges(true);
  };

  // Add function to save floor mapping data
  const saveFloorMappingData = async () => {
    if (!floorMappingData) return;

    try {
      // Update project with the new floor mapping data
      await adminUpdateProject(Number(id), { floor_mapping: floorMappingData as any });

      setHasUnsavedChanges(false);
      setShowUnsavedWarning(false);
      // Show a success message
      alert('樓層配置資料已儲存成功！');
    } catch (error) {
      console.error('Failed to save floor mapping data:', error);
      alert('儲存失敗，請重試。');
    }
  };

  // Add function to download table as Excel
  const downloadAsExcel = () => {
    if (!floorMappingData || Object.keys(furnitureTotals).length === 0) return;

    // Create array for Excel export
    const tableData = Object.keys(furnitureTotals).map((furnitureType) => {
      // Calculate room type furniture mapping (same logic as in the table)
      const roomTypeMap: Record<string, { count: number; furniture: number }> = {};

      if (floorMappingData) {
        floorMappingData.forEach((roomType) => {
          const lowerCaseRoomName = roomType.name.toLowerCase();
          if (!roomTypeMap[lowerCaseRoomName]) {
            roomTypeMap[lowerCaseRoomName] = { count: 0, furniture: 0 };
          }
          roomTypeMap[lowerCaseRoomName].count += roomType.total;
        });
      }

      rooms.forEach((room) => {
        const lowerCaseRoomName = room.name.toLowerCase();
        const furnitureCount =
          room.furniture?.find((item: any) => item.type === furnitureType)?.count || 0;

        Object.keys(roomTypeMap).forEach((roomType) => {
          if (lowerCaseRoomName.includes(roomType)) {
            roomTypeMap[roomType].furniture = furnitureCount;
          }
        });
      });

      // Calculate total
      let totalFurniture = 0;
      const breakdown: string[] = [];

      Object.entries(roomTypeMap).forEach(([roomType, data]) => {
        if (data.furniture > 0) {
          const roomTypeTotalFurniture = data.count * data.furniture;
          totalFurniture += roomTypeTotalFurniture;
          breakdown.push(`${roomType}: ${data.count}×${data.furniture}`);
        }
      });

      return {
        家具類型: furnitureType,
        總數量: totalFurniture,
        明細: breakdown.join(', '),
      };
    });

    // Convert to CSV
    const headers = ['家具類型', '總數量', '明細'];
    let csvContent = headers.join(',') + '\n';

    tableData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header as keyof typeof row];
        // Wrap in quotes to handle commas in the content
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvContent += values.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name}-家具統計.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 處理專案名稱編輯
  const handleEditProjectName = async (newName: string) => {
    try {
      await adminUpdateProject(Number(id), { name: newName });
      setProject({ ...project, name: newName });
      setEditingProject(false);
    } catch (error) {
      console.error('Failed to update project name:', error);
    }
  };

  // 處理刪除專案
  const handleDeleteProject = async () => {
    try {
      await adminDeleteProject(Number(id));
      // 重定向到專案列表頁面
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
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
          {editingProject ? (
            <div className="flex items-center gap-2">
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="max-w-[300px]"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditProjectName(editProjectName)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditingProject(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingProject(true);
                  setEditProjectName(project.name);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-4">
            {confirmDeleteProject ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-500">確定要刪除專案?</span>
                <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
                  確認
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDeleteProject(false)}>
                  取消
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="text-red-500"
                onClick={() => setConfirmDeleteProject(true)}
              >
                刪除專案
              </Button>
            )}
            <Link href="/">
              <Button variant="outline">返回專案列表</Button>
            </Link>
          </div>
        </header>

        <main className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
            {/** Tab按鈕  */}
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="overview">總覽</TabsTrigger>
                <TabsTrigger value="details">細項</TabsTrigger>
                <TabsTrigger value="mapping">房間與樓層對應</TabsTrigger>
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
                  <CardTitle className="flex justify-between items-center">
                    <span>家具總計</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">總家具數量</div>
                      <div className="text-2xl font-bold">
                        {Object.values(furnitureTotals).reduce(
                          (sum: number, count: number) => sum + count,
                          0,
                        )}
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
                </CardContent>
              </Card>

              {/* 依據樓層配置計算家具總數 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>依據樓層配置計算家具總數</span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowChart(!showChart)}>
                        {showChart ? '顯示表格' : '顯示圖表'}
                      </Button>
                      <Button variant="outline" onClick={downloadAsExcel} className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showChart ? (
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.keys(furnitureTotals).map((furnitureType) => {
                            // 計算每個房間類型的家具數量（不區分大小寫）
                            const roomTypeMap: Record<
                              string,
                              { count: number; furniture: number }
                            > = {};

                            // 整理樓層資料中的每種房型總數
                            if (floorMappingData) {
                              floorMappingData.forEach((roomType) => {
                                const lowerCaseRoomName = roomType.name.toLowerCase();
                                if (!roomTypeMap[lowerCaseRoomName]) {
                                  roomTypeMap[lowerCaseRoomName] = { count: 0, furniture: 0 };
                                }
                                roomTypeMap[lowerCaseRoomName].count += roomType.total;
                              });
                            }

                            // 將每個房間的家具資料對應到房型
                            rooms.forEach((room) => {
                              const lowerCaseRoomName = room.name.toLowerCase();
                              const furnitureCount =
                                room.furniture?.find((item: any) => item.type === furnitureType)
                                  ?.count || 0;

                              // 將家具數量分配到對應的房型
                              Object.keys(roomTypeMap).forEach((roomType) => {
                                if (lowerCaseRoomName.includes(roomType)) {
                                  roomTypeMap[roomType].furniture = furnitureCount;
                                }
                              });
                            });

                            // 計算總數
                            let totalFurniture = 0;

                            Object.entries(roomTypeMap).forEach(([roomType, data]) => {
                              if (data.furniture > 0) {
                                const roomTypeTotalFurniture = data.count * data.furniture;
                                totalFurniture += roomTypeTotalFurniture;
                              }
                            });

                            return {
                              type: furnitureType,
                              count: totalFurniture,
                            };
                          })}
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
                  ) : floorMappingData && rooms.length > 0 ? (
                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted border-b">
                            <th className="text-left p-3 sticky left-0 bg-muted z-10">家具類型</th>
                            <th className="text-center p-3">總數量</th>
                            <th className="text-left p-3 whitespace-nowrap">數量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(furnitureTotals).map((furnitureType) => {
                            // 計算每個房間類型的家具數量（不區分大小寫）
                            const roomTypeMap: Record<
                              string,
                              { count: number; furniture: number }
                            > = {};

                            // 整理樓層資料中的每種房型總數
                            floorMappingData.forEach((roomType) => {
                              const lowerCaseRoomName = roomType.name.toLowerCase();
                              if (!roomTypeMap[lowerCaseRoomName]) {
                                roomTypeMap[lowerCaseRoomName] = { count: 0, furniture: 0 };
                              }
                              roomTypeMap[lowerCaseRoomName].count += roomType.total;
                            });

                            // 將每個房間的家具資料對應到房型
                            rooms.forEach((room) => {
                              const lowerCaseRoomName = room.name.toLowerCase();
                              const furnitureCount =
                                room.furniture?.find((item: any) => item.type === furnitureType)
                                  ?.count || 0;

                              // 將家具數量分配到對應的房型
                              Object.keys(roomTypeMap).forEach((roomType) => {
                                if (lowerCaseRoomName.includes(roomType)) {
                                  roomTypeMap[roomType].furniture = furnitureCount;
                                }
                              });
                            });

                            // 計算總數
                            let totalFurniture = 0;
                            const quantityBreakdown: {
                              roomType: string;
                              count: number;
                              furniture: number;
                            }[] = [];

                            Object.entries(roomTypeMap).forEach(([roomType, data]) => {
                              if (data.furniture > 0) {
                                const roomTypeTotalFurniture = data.count * data.furniture;
                                totalFurniture += roomTypeTotalFurniture;
                                quantityBreakdown.push({
                                  roomType,
                                  count: data.count,
                                  furniture: data.furniture,
                                });
                              }
                            });

                            return (
                              <tr key={furnitureType} className="border-b">
                                <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                  {furnitureType}
                                </td>
                                <td className="text-center p-3 font-bold">{totalFurniture}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-3">
                                    {quantityBreakdown.length > 0 ? (
                                      quantityBreakdown.map((item, idx) => (
                                        <div key={idx} className="whitespace-nowrap">
                                          <div className="text-xs text-muted-foreground">
                                            {item.roomType}
                                          </div>
                                          <div className="font-medium">
                                            {item.count}×{item.furniture}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">無數據</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      {!floorMappingData
                        ? '尚未上傳樓層配置資料'
                        : !rooms.length
                        ? '尚未新增任何房間'
                        : '無法計算'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapping" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div className="flex justify-between items-center gap-2">
                      <span>房間與樓層對應</span>
                      <Button onClick={() => addNewRoomType()} variant="outline" className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        新增房型
                      </Button>
                      <Button onClick={() => addNewFloor()} variant="outline" className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        新增樓層
                      </Button>
                    </div>

                    <div className="flex justify-end gap-2">
                      {hasUnsavedChanges && (
                        <Button onClick={() => saveFloorMappingData()}>儲存變更</Button>
                      )}

                      <Button
                        onClick={() => setViewImageDialogOpen(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        查看原始配置圖
                      </Button>

                      <Dialog
                        open={floorMappingDialogOpen}
                        onOpenChange={setFloorMappingDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            上傳房間樓層配置
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>上傳房間樓層配置圖</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="floor-mapping-image">上傳房間樓層配置圖</Label>
                              <Input
                                id="floor-mapping-image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setFloorMappingFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={handleFloorMappingUpload}
                              disabled={!floorMappingFile || processingFloorMapping}
                            >
                              {processingFloorMapping ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                  AI 分析中...
                                </div>
                              ) : (
                                '開始分析'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showFloorMapping && floorMappingData ? (
                    <>
                      <div className="border rounded-lg overflow-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted border-b">
                              <th className="text-left p-3 sticky left-0 bg-muted z-10">房型</th>
                              <th className="text-center p-3">總數</th>
                              {floorMappingData[0].floors.map((floor, floorIndex) => (
                                <th key={floorIndex} className="text-center p-3 relative">
                                  {editingFloorCell &&
                                  editingFloorCell.type === 'floor' &&
                                  editingFloorCell.floorIndex === floorIndex ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={editingFloorCell.value}
                                        onChange={(e) =>
                                          setEditingFloorCell({
                                            ...editingFloorCell,
                                            value: e.target.value,
                                          })
                                        }
                                        className="w-24 py-1 h-8"
                                        autoFocus
                                        onBlur={() =>
                                          handleFloorOrRoomTypeEdit(
                                            'floor',
                                            floorIndex,
                                            editingFloorCell.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleFloorOrRoomTypeEdit(
                                              'floor',
                                              floorIndex,
                                              editingFloorCell.value,
                                            );
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <span>{floor.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() =>
                                          setEditingFloorCell({
                                            type: 'floor',
                                            floorIndex: floorIndex,
                                            value: floor.name,
                                          })
                                        }
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-600"
                                        onClick={() => deleteFloor(floorIndex)}
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {floorMappingData.map((roomType, roomTypeIndex) => (
                              <tr
                                key={`room-type-${roomTypeIndex}-${roomType.name}`}
                                className="border-b"
                              >
                                <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                  {editingFloorCell &&
                                  editingFloorCell.type === 'roomType' &&
                                  editingFloorCell.roomTypeIndex === roomTypeIndex ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={editingFloorCell.value}
                                        onChange={(e) =>
                                          setEditingFloorCell({
                                            ...editingFloorCell,
                                            value: e.target.value,
                                          })
                                        }
                                        className="w-28 py-1 h-8"
                                        autoFocus
                                        onBlur={() =>
                                          handleFloorOrRoomTypeEdit(
                                            'roomType',
                                            roomTypeIndex,
                                            editingFloorCell.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleFloorOrRoomTypeEdit(
                                              'roomType',
                                              roomTypeIndex,
                                              editingFloorCell.value,
                                            );
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span>{roomType.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() =>
                                          setEditingFloorCell({
                                            type: 'roomType',
                                            roomTypeIndex: roomTypeIndex,
                                            value: roomType.name,
                                          })
                                        }
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-600"
                                        onClick={() => deleteRoomType(roomTypeIndex)}
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </td>
                                <td className="text-center font-bold">{roomType.total}</td>
                                {roomType.floors.map((floor, floorIndex) => (
                                  <td
                                    key={`room-${roomTypeIndex}-floor-${floorIndex}-${floor.name}`}
                                    className="text-center p-3"
                                  >
                                    {editingFloorCell &&
                                    editingFloorCell.type === 'count' &&
                                    editingFloorCell.floorIndex === floorIndex &&
                                    editingFloorCell.roomTypeIndex === roomTypeIndex ? (
                                      <Input
                                        type="number"
                                        value={editingFloorCell.value}
                                        onChange={(e) =>
                                          setEditingFloorCell({
                                            ...editingFloorCell,
                                            value: e.target.value,
                                          })
                                        }
                                        className="w-16 py-1 h-8 mx-auto"
                                        autoFocus
                                        onBlur={() =>
                                          handleRoomCountEdit(
                                            floorIndex,
                                            roomTypeIndex,
                                            editingFloorCell.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleRoomCountEdit(
                                              floorIndex,
                                              roomTypeIndex,
                                              editingFloorCell.value,
                                            );
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="cursor-pointer hover:bg-muted rounded-md py-1 px-2 transition-colors"
                                        onClick={() =>
                                          setEditingFloorCell({
                                            type: 'count',
                                            floorIndex: floorIndex,
                                            roomTypeIndex: roomTypeIndex,
                                            value: floor.count.toString(),
                                          })
                                        }
                                      >
                                        {floor.count}
                                      </div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {/* Calculate and display column totals */}
                            <tr className="bg-muted">
                              <td className="p-3 font-bold sticky left-0 bg-muted z-10">總計</td>
                              <td className="text-center font-bold">
                                {floorMappingData.reduce(
                                  (sum, roomType) => sum + roomType.total,
                                  0,
                                )}
                              </td>
                              {floorMappingData[0].floors.map((floor, floorIndex) => {
                                const floorTotal = floorMappingData.reduce(
                                  (sum, roomType) => sum + roomType.floors[floorIndex].count,
                                  0,
                                );
                                return (
                                  <td
                                    key={`total-${floor.name}`}
                                    className="text-center p-3 font-bold"
                                  >
                                    {floorTotal}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      尚未有房間樓層配置資料
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
                <DialogContent className="max-w-8xl">
                  <DialogHeader>
                    <DialogTitle>樓層配置原始圖片</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center items-center p-4">
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/furniture-system/projects/${id}/rooms/room%20mix.png`}
                      alt="樓層配置圖"
                      className="max-w-full max-h-[80vh] object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>家具細項統計</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rooms.length > 0 ? (
                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted border-b">
                            <th className="text-left p-3 sticky left-0 bg-muted z-10">房間</th>
                            {Object.keys(furnitureTotals).map((type) => (
                              <th key={type} className="text-center p-3">
                                {type}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((room) => {
                            // 計算該房間每種家具的數量
                            const roomFurnitureCounts: Record<string, number> = {};

                            room.furniture?.forEach((item: any) => {
                              roomFurnitureCounts[item.type] = item.count;
                            });

                            return (
                              <tr key={room.id} className="border-b">
                                <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                  {room.name}
                                </td>
                                {Object.keys(furnitureTotals).map((type) => (
                                  <td key={type} className="text-center p-3">
                                    {roomFurnitureCounts[type] || 0}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">尚未新增任何房間</div>
                  )}
                </CardContent>
              </Card>
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
                              <input type="file" accept=".pdf" className="hidden" />
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
                              {room.furniture.map((item: any, index: number) => (
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
          </Tabs>
        </main>
      </div>
    </div>
  );
}
