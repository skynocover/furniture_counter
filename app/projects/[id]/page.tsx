'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { PlusCircle, Pencil, Check, X, Trash } from 'lucide-react';
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
  adminUpdateProject,
} from '@/utils/db-server';
import { uploadFileToSupabase } from '@/utils/upload-helper';
import { ParseFurniture, ParseFloorMapping } from '@/utils/gemini';

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
  const [floorMappingData, setFloorMappingData] = useState({
    floors: ['1F', '2F', '3F', '4F', '5F'],
    roomTypes: ['單人房', '雙人房', '套房', '家庭房'],
    mapping: [
      [5, 3, 0, 0], // 1F
      [8, 4, 2, 0], // 2F
      [6, 6, 2, 0], // 3F
      [0, 8, 4, 2], // 4F
      [0, 0, 6, 4], // 5F
    ],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

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
        floorMappingFile.name,
      );

      const floorMapping = await ParseFloorMapping({
        fileUrl: picUrl,
        fileName: floorMappingFile.name,
      });

      await adminUpdateProject(Number(id), { floor_mapping: floorMapping });

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

    if (type === 'floor') {
      const newFloors = [...floorMappingData.floors];
      newFloors[index] = newValue;
      setFloorMappingData({ ...floorMappingData, floors: newFloors });
    } else {
      const newRoomTypes = [...floorMappingData.roomTypes];
      newRoomTypes[index] = newValue;
      setFloorMappingData({ ...floorMappingData, roomTypes: newRoomTypes });
    }
    setEditingFloorCell(null);
    setHasUnsavedChanges(true);
  };

  // Add function to handle room count edits
  const handleRoomCountEdit = (floorIndex: number, roomTypeIndex: number, newValue: string) => {
    const numValue = parseInt(newValue);
    if (isNaN(numValue) || numValue < 0) return;

    const newMapping = floorMappingData.mapping.map((row, rowIdx) => {
      if (rowIdx === floorIndex) {
        const newRow = [...row];
        newRow[roomTypeIndex] = numValue;
        return newRow;
      }
      return row;
    });

    setFloorMappingData({ ...floorMappingData, mapping: newMapping });
    setEditingFloorCell(null);
    setHasUnsavedChanges(true);
  };

  // Add function to add new floor
  const addNewFloor = () => {
    const newFloors = [...floorMappingData.floors, `${floorMappingData.floors.length + 1}F`];
    const newMapping = [
      ...floorMappingData.mapping,
      new Array(floorMappingData.roomTypes.length).fill(0),
    ];
    setFloorMappingData({
      ...floorMappingData,
      floors: newFloors,
      mapping: newMapping,
    });
    setHasUnsavedChanges(true);
  };

  // Add function to add new room type
  const addNewRoomType = () => {
    const newRoomTypes = [...floorMappingData.roomTypes, '新房型'];
    const newMapping = floorMappingData.mapping.map((row) => [...row, 0]);
    setFloorMappingData({
      ...floorMappingData,
      roomTypes: newRoomTypes,
      mapping: newMapping,
    });
    setHasUnsavedChanges(true);
  };

  // Add function to delete a floor
  const deleteFloor = (floorIndex: number) => {
    // Must have at least one floor
    if (floorMappingData.floors.length <= 1) return;

    const newFloors = [...floorMappingData.floors];
    newFloors.splice(floorIndex, 1);

    const newMapping = [...floorMappingData.mapping];
    newMapping.splice(floorIndex, 1);

    setFloorMappingData({
      ...floorMappingData,
      floors: newFloors,
      mapping: newMapping,
    });
    setHasUnsavedChanges(true);
  };

  // Add function to delete a room type
  const deleteRoomType = (roomTypeIndex: number) => {
    // Must have at least one room type
    if (floorMappingData.roomTypes.length <= 1) return;

    const newRoomTypes = [...floorMappingData.roomTypes];
    newRoomTypes.splice(roomTypeIndex, 1);

    const newMapping = floorMappingData.mapping.map((row) => {
      const newRow = [...row];
      newRow.splice(roomTypeIndex, 1);
      return newRow;
    });

    setFloorMappingData({
      ...floorMappingData,
      roomTypes: newRoomTypes,
      mapping: newMapping,
    });
    setHasUnsavedChanges(true);
  };

  // Add function to save floor mapping data
  const saveFloorMappingData = () => {
    // In a real application, you would send the data to your backend here
    // For now, we'll just reset the unsaved changes flag
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    // Show a success message
    alert('樓層配置資料已儲存成功！');
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
            {/** Tab按鈕  */}
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="overview">總覽</TabsTrigger>
                <TabsTrigger value="details">細項</TabsTrigger>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>房間與樓層對應</span>
                    <Dialog open={floorMappingDialogOpen} onOpenChange={setFloorMappingDialogOpen}>
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showFloorMapping ? (
                    <div className="border rounded-lg overflow-auto">
                      {hasUnsavedChanges && showUnsavedWarning && (
                        <div className="bg-amber-100 border border-amber-300 text-amber-800 p-2 mb-2 flex justify-between items-center">
                          <span>您有未儲存的變更，請記得儲存您的修改。</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-800 border-amber-300"
                            onClick={() => setShowUnsavedWarning(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addNewFloor} title="新增樓層">
                            <PlusCircle className="h-4 w-4 mr-1" /> 新增樓層
                          </Button>
                          <Button size="sm" onClick={addNewRoomType} title="新增房型">
                            <PlusCircle className="h-4 w-4 mr-1" /> 新增房型
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          className={`${
                            hasUnsavedChanges
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-400 hover:bg-gray-500'
                          }`}
                          onClick={saveFloorMappingData}
                          disabled={!hasUnsavedChanges}
                        >
                          <Check className="h-4 w-4 mr-1" /> 儲存變更
                        </Button>
                      </div>
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted border-b">
                            <th className="text-left p-3 sticky left-0 bg-muted z-10">房型/樓層</th>
                            {floorMappingData.floors.map((floor, floorIndex) => (
                              <th key={floorIndex} className="text-center p-3">
                                <div className="flex flex-col items-center">
                                  {editingFloorCell &&
                                  editingFloorCell.type === 'floor' &&
                                  editingFloorCell.floorIndex === floorIndex ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Input
                                        value={editingFloorCell.value}
                                        onChange={(e) =>
                                          setEditingFloorCell({
                                            ...editingFloorCell,
                                            value: e.target.value,
                                          })
                                        }
                                        className="max-w-[100px]"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleFloorOrRoomTypeEdit(
                                              'floor',
                                              floorIndex,
                                              editingFloorCell.value,
                                            );
                                          } else if (e.key === 'Escape') {
                                            setEditingFloorCell(null);
                                          }
                                        }}
                                        onBlur={() =>
                                          handleFloorOrRoomTypeEdit(
                                            'floor',
                                            floorIndex,
                                            editingFloorCell.value,
                                          )
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className="cursor-pointer hover:underline"
                                      onClick={() =>
                                        setEditingFloorCell({
                                          type: 'floor',
                                          floorIndex,
                                          value: floor,
                                        })
                                      }
                                    >
                                      {floor}
                                    </div>
                                  )}
                                  {floorMappingData.floors.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-red-500 hover:text-red-700 mt-1"
                                      onClick={() => deleteFloor(floorIndex)}
                                      title="刪除樓層"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="text-center p-3 font-bold">總計</th>
                            <th className="text-center p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorMappingData.roomTypes.map((roomType, roomTypeIndex) => {
                            // Calculate row total (total rooms of this type across all floors)
                            const rowTotal = floorMappingData.mapping.reduce(
                              (sum, floorData) => sum + floorData[roomTypeIndex],
                              0,
                            );

                            return (
                              <tr key={roomType} className="border-b">
                                <td className="p-3 font-medium sticky left-0 bg-background z-10">
                                  <div className="flex justify-between items-center">
                                    {editingFloorCell &&
                                    editingFloorCell.type === 'roomType' &&
                                    editingFloorCell.roomTypeIndex === roomTypeIndex ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={editingFloorCell.value}
                                          onChange={(e) =>
                                            setEditingFloorCell({
                                              ...editingFloorCell,
                                              value: e.target.value,
                                            })
                                          }
                                          className="max-w-[150px]"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleFloorOrRoomTypeEdit(
                                                'roomType',
                                                roomTypeIndex,
                                                editingFloorCell.value,
                                              );
                                            } else if (e.key === 'Escape') {
                                              setEditingFloorCell(null);
                                            }
                                          }}
                                          onBlur={() =>
                                            handleFloorOrRoomTypeEdit(
                                              'roomType',
                                              roomTypeIndex,
                                              editingFloorCell.value,
                                            )
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="cursor-pointer hover:underline"
                                        onClick={() =>
                                          setEditingFloorCell({
                                            type: 'roomType',
                                            roomTypeIndex,
                                            value: roomType,
                                          })
                                        }
                                      >
                                        {roomType}
                                      </div>
                                    )}
                                    {floorMappingData.roomTypes.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-red-500 hover:text-red-700"
                                        onClick={() => deleteRoomType(roomTypeIndex)}
                                        title="刪除房型"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                {floorMappingData.floors.map((floor, floorIndex) => (
                                  <td key={`${roomType}-${floor}`} className="text-center p-3">
                                    {editingFloorCell &&
                                    editingFloorCell.type === 'count' &&
                                    editingFloorCell.floorIndex === floorIndex &&
                                    editingFloorCell.roomTypeIndex === roomTypeIndex ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <Input
                                          type="number"
                                          value={editingFloorCell.value}
                                          onChange={(e) =>
                                            setEditingFloorCell({
                                              ...editingFloorCell,
                                              value: e.target.value,
                                            })
                                          }
                                          className="max-w-[80px]"
                                          min="0"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleRoomCountEdit(
                                                floorIndex,
                                                roomTypeIndex,
                                                editingFloorCell.value,
                                              );
                                            } else if (e.key === 'Escape') {
                                              setEditingFloorCell(null);
                                            }
                                          }}
                                          onBlur={() =>
                                            handleRoomCountEdit(
                                              floorIndex,
                                              roomTypeIndex,
                                              editingFloorCell.value,
                                            )
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                                        onClick={() =>
                                          setEditingFloorCell({
                                            type: 'count',
                                            floorIndex,
                                            roomTypeIndex,
                                            value:
                                              floorMappingData.mapping[floorIndex][
                                                roomTypeIndex
                                              ].toString(),
                                          })
                                        }
                                      >
                                        {floorMappingData.mapping[floorIndex][roomTypeIndex]}
                                      </div>
                                    )}
                                  </td>
                                ))}
                                <td className="text-center p-3 font-bold bg-gray-50">{rowTotal}</td>
                                {roomTypeIndex === 0 && (
                                  <td
                                    rowSpan={floorMappingData.roomTypes.length}
                                    className="text-center align-middle"
                                  ></td>
                                )}
                              </tr>
                            );
                          })}
                          {/* Column Totals */}
                          <tr className="bg-muted">
                            <td className="p-3 font-bold sticky left-0 bg-muted z-10">總計</td>
                            {floorMappingData.floors.map((floor, floorIndex) => {
                              // Calculate column total (total rooms on this floor)
                              const floorTotal = floorMappingData.mapping[floorIndex].reduce(
                                (sum, count) => sum + count,
                                0,
                              );

                              return (
                                <td
                                  key={`total-${floor}`}
                                  className="text-center p-3 font-bold bg-gray-100"
                                >
                                  {floorTotal}
                                </td>
                              );
                            })}
                            {/* Grand Total */}
                            <td className="text-center p-3 font-bold bg-gray-200">
                              {floorMappingData.mapping.reduce(
                                (sum, row) =>
                                  sum + row.reduce((rowSum, count) => rowSum + count, 0),
                                0,
                              )}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      尚未上傳房間樓層配置圖，請點擊上方按鈕上傳
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>家具細項統計</span>
                    <Button variant="outline" onClick={() => setShowChart(!showChart)}>
                      {showChart ? '顯示表格' : '顯示圖表'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showChart ? (
                    <div className="h-[400px] w-full">
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
                  ) : rooms.length > 0 ? (
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
                          {/* 總計 */}
                          <tr className="bg-muted">
                            <td className="p-3 font-bold sticky left-0 bg-muted z-10">總計</td>
                            {Object.keys(furnitureTotals).map((type) => (
                              <td key={type} className="text-center p-3 font-bold">
                                {furnitureTotals[type]}
                              </td>
                            ))}
                          </tr>
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
