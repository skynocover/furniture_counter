"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Home, Layers, ArrowRight } from "lucide-react"

// 模擬數據
const mockData = {
  rooms: [
    {
      id: 1,
      name: "客廳",
      floor: 1,
      furniture: [
        { type: "沙發", count: 2 },
        { type: "茶几", count: 1 },
        { type: "電視櫃", count: 1 },
        { type: "書架", count: 2 },
      ],
    },
    {
      id: 2,
      name: "主臥室",
      floor: 1,
      furniture: [
        { type: "床", count: 1 },
        { type: "衣櫃", count: 2 },
        { type: "梳妝台", count: 1 },
        { type: "床頭櫃", count: 2 },
      ],
    },
    {
      id: 3,
      name: "次臥室",
      floor: 1,
      furniture: [
        { type: "床", count: 1 },
        { type: "書桌", count: 1 },
        { type: "衣櫃", count: 1 },
      ],
    },
    {
      id: 4,
      name: "廚房",
      floor: 1,
      furniture: [
        { type: "餐桌", count: 1 },
        { type: "餐椅", count: 4 },
        { type: "廚櫃", count: 3 },
      ],
    },
  ],
  buildingInfo: {
    totalFloors: 1,
    totalRooms: 4,
  },
}

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState("all")

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">PDF分析結果</h1>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button variant="outline">返回上傳</Button>
          </Link>
          <Link href="/summary">
            <Button className="gap-2">
              查看總計
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            建築信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">總樓層</div>
              <div className="text-2xl font-bold">{mockData.buildingInfo.totalFloors}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">總房間數</div>
              <div className="text-2xl font-bold">{mockData.buildingInfo.totalRooms}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">所有房間</TabsTrigger>
          {mockData.rooms.map((room) => (
            <TabsTrigger key={room.id} value={`room-${room.id}`}>
              {room.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2">
            {mockData.rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      {room.name}
                    </div>
                    <Badge variant="outline">樓層 {room.floor}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {room.furniture.map((item, index) => (
                      <div key={index} className="flex justify-between py-1 border-b last:border-0">
                        <span>{item.type}</span>
                        <span className="font-medium">{item.count} 件</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {mockData.rooms.map((room) => (
          <TabsContent key={room.id} value={`room-${room.id}`}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    {room.name} 詳細信息
                  </div>
                  <Badge variant="outline">樓層 {room.floor}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {room.furniture.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">家具類型</div>
                        <div className="text-lg font-medium">{item.type}</div>
                        <div className="mt-2 text-sm text-muted-foreground">數量</div>
                        <div className="text-lg font-medium">{item.count} 件</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

