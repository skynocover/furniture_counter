"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Download, PieChartIcon } from "lucide-react"

// 模擬數據
const mockData = {
  furnitureSummary: [
    { type: "沙發", count: 2 },
    { type: "茶几", count: 1 },
    { type: "電視櫃", count: 1 },
    { type: "書架", count: 2 },
    { type: "床", count: 2 },
    { type: "衣櫃", count: 3 },
    { type: "梳妝台", count: 1 },
    { type: "床頭櫃", count: 2 },
    { type: "書桌", count: 1 },
    { type: "餐桌", count: 1 },
    { type: "餐椅", count: 4 },
    { type: "廚櫃", count: 3 },
  ],
  roomSummary: [
    { name: "客廳", itemCount: 6 },
    { name: "主臥室", itemCount: 6 },
    { name: "次臥室", itemCount: 3 },
    { name: "廚房", itemCount: 8 },
  ],
}

export default function SummaryPage() {
  const totalItems = mockData.furnitureSummary.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">家具總計數量</h1>
        <div className="flex gap-2">
          <Link href="/results">
            <Button variant="outline">返回結果</Button>
          </Link>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            導出報告
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            總計統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">家具總數</div>
              <div className="text-3xl font-bold">{totalItems} 件</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">家具種類</div>
              <div className="text-3xl font-bold">{mockData.furnitureSummary.length} 種</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="by-type" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="by-type">按家具類型</TabsTrigger>
          <TabsTrigger value="by-room">按房間</TabsTrigger>
        </TabsList>

        <TabsContent value="by-type">
          <Card>
            <CardHeader>
              <CardTitle>家具類型統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData.furnitureSummary} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="數量" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 border rounded-lg divide-y">
                <div className="grid grid-cols-3 font-medium p-3">
                  <div>家具類型</div>
                  <div className="text-center">數量</div>
                  <div className="text-right">佔比</div>
                </div>
                {mockData.furnitureSummary.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 p-3">
                    <div>{item.type}</div>
                    <div className="text-center">{item.count} 件</div>
                    <div className="text-right">{((item.count / totalItems) * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-room">
          <Card>
            <CardHeader>
              <CardTitle>房間家具統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData.roomSummary} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="itemCount" name="家具數量" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 border rounded-lg divide-y">
                <div className="grid grid-cols-3 font-medium p-3">
                  <div>房間</div>
                  <div className="text-center">家具數量</div>
                  <div className="text-right">佔比</div>
                </div>
                {mockData.roomSummary.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 p-3">
                    <div>{item.name}</div>
                    <div className="text-center">{item.itemCount} 件</div>
                    <div className="text-right">{((item.itemCount / totalItems) * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

