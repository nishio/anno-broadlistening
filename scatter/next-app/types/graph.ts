export interface GraphNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
}

export interface GraphEdge {
  from: string
  to: string
  points: Array<{ x: number; y: number }>
}

export interface TaskData {
  id: string
  title: string
  dependencies?: {
    must: Array<{
      task_id: string
      reason: string
    }>
  }
}
