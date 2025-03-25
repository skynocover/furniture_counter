"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Check, ArrowRight } from "lucide-react"

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleUpload = () => {
    if (files.length === 0) return

    setUploading(true)

    // 模擬上傳過程
    setTimeout(() => {
      setUploading(false)
      setUploaded(true)
    }, 1500)
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">上傳PDF文件</h1>
        <Link href="/">
          <Button variant="outline">返回首頁</Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">拖放PDF文件或點擊上傳</h3>
              <p className="text-sm text-gray-500 mb-4">支持上傳多個PDF文件</p>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline">
                  選擇文件
                </Button>
              </Label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">已選擇的文件 ({files.length})</h4>
                <div className="border rounded-lg divide-y">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center p-3">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-sm text-gray-500">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setFiles([])} disabled={uploading}>
                    清除
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading || uploaded}>
                    {uploading ? "上傳中..." : uploaded ? "已上傳" : "上傳文件"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploaded && (
        <div className="space-y-4">
          <div className="flex items-center text-green-600 gap-2 p-4 bg-green-50 rounded-lg">
            <Check className="h-5 w-5" />
            <span>文件上傳成功！系統正在分析PDF中的家具信息</span>
          </div>

          <div className="flex justify-end">
            <Link href="/results">
              <Button className="gap-2">
                查看分析結果
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

