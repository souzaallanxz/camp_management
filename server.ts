import express from 'express'
import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from './src/lib/uploadthing'
import cors from 'cors'

const app = express()

app.use(cors())

const PORT = 3001
app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`)
}) 