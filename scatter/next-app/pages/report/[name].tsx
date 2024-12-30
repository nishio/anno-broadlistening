import {GetStaticPropsContext} from 'next'
import Report from '../../components/Report'
import {Result} from '../../types'

export async function getStaticPaths() {
  const report = process.env.REPORT
  if (report && report.length) {
    return {paths: [{params: {name: report}}], fallback: false}
  }
  const subfolders = ['aipubcom', 'example-polis']
  return {paths: subfolders.map((name: string) => ({params: {name}})), fallback: false}
}

export async function getStaticProps({params}: GetStaticPropsContext) {
  const fs = await import('fs')
  const path = await import('path')
  const resultPath = path.join(process.cwd(), 'public', `${params!.name}/result.json`)
  try {
    const result = fs.readFileSync(resultPath, 'utf8')
    return {props: {name: params!.name, result: JSON.parse(result)}}
  } catch (error) {
    console.error(`Error loading result.json for ${params!.name}:`, error)
    return {notFound: true}
  }
}

export default function Page({result}: { name: string, result: Result }) {
  return <Report {...result} />
}
