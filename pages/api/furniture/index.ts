import { NextApiRequest, NextApiResponse } from "next";
import { adminGetFurniture, adminAddFurniture } from "@/utils/db-server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const furniture = await adminGetFurniture();
      return res.status(200).json(furniture);
    }

    if (req.method === "POST") {
      const furniture = await adminAddFurniture(req.body);
      return res.status(201).json(furniture);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Error in API route:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
