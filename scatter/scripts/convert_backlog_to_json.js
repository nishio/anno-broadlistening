const fs = require('fs')
const yaml = require('js-yaml')
const path = require('path')

const backlogPath = '/home/ubuntu/ai_project_manager_data/tasks/backlog.yaml'
const outputDir = path.join(__dirname, '../next-app/data')
const outputPath = path.join(outputDir, 'backlogTasks.json')

try {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Read and parse YAML
  const yamlContent = fs.readFileSync(backlogPath, 'utf8')
  // Skip the git diff header if present
  const cleanContent = yamlContent.split('\n').slice(1).join('\n')
  const parsed = yaml.load(cleanContent)

  // Convert tasks to a simpler structure
  const simplifiedTasks = parsed.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    dependencies: task.dependencies
  }))

  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(simplifiedTasks, null, 2))
  console.log('Successfully converted backlog.yaml to backlogTasks.json')
} catch (error) {
  console.error('Error converting backlog.yaml:', error.message)
  process.exit(1)
}
