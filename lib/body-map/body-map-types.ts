// Body Map Types: file-to-domain inventory for the ChefFlow codebase

export type Organ = {
  name: string
  files: string[]
  routes: string[]
  components: string[]
  fileCount: number
}

export type BodyMap = {
  organs: Organ[]
  totalFiles: number
  unmappedFiles: string[]
  generatedAt: string
}

export type BodyMapSummary = {
  organCount: number
  totalFiles: number
  coveragePercent: number
  largestOrgan: string
  smallestOrgan: string
}
