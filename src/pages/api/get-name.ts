import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@workos-inc/authkit-nextjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getSession(req);

  if (!session || !session.user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({ name: session.user.firstName });
}