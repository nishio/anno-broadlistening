import React from 'react'
import backlogTasks from '@/data/backlogTasks.json'
import TaskDependencyGraph from '@/components/TaskDependencyGraph'
import { TaskData } from '@/types/graph'

const DependencyGraphPage: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{
        marginBottom: '20px',
        color: '#1B5E20',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Task Dependencies
      </h1>
      <div style={{
        width: '100%',
        height: 'calc(100vh - 100px)',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <TaskDependencyGraph
          tasks={backlogTasks as TaskData[]}
          width={1200}
          height={800}
        />
      </div>
    </div>
  )
}

export default DependencyGraphPage
