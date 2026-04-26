import { jsPDF } from 'jspdf'

const PAGE_W = 210      // A4 mm
const MARGIN = 18
const CONTENT_W = PAGE_W - MARGIN * 2
const PAGE_H = 297
const BOTTOM_MARGIN = 20

function addPageIfNeeded(doc: jsPDF, y: number, needed = 8): number {
  if (y + needed > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function drawHeader(
  doc: jsPDF,
  title: string,
  meta: { label: string; value: string }[],
): number {
  let y = MARGIN

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const titleLines = doc.splitTextToSize(title, CONTENT_W) as string[]
  titleLines.forEach((line: string) => {
    y = addPageIfNeeded(doc, y, 10)
    doc.text(line, MARGIN, y)
    y += 8
  })

  // Metadata
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  meta.forEach(({ label, value }) => {
    y = addPageIfNeeded(doc, y, 5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}: `, MARGIN, y)
    const labelWidth = doc.getTextWidth(`${label}: `)
    doc.setFont('helvetica', 'normal')
    doc.text(value, MARGIN + labelWidth, y)
    y += 5
  })
  doc.setTextColor(0, 0, 0)

  // Divider
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 6

  return y
}

export function exportNotesAsPdf(
  title: string,
  source: string,
  date: string,
  markdownText: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, title, [
    { label: 'Source', value: source },
    { label: 'Created', value: new Date(date).toLocaleDateString() },
  ])

  const lines = markdownText.split('\n')

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('### ')) {
      const text = line.slice(4)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      y = addPageIfNeeded(doc, y, 8)
      y += 2
      const wrapped = doc.splitTextToSize(text, CONTENT_W) as string[]
      wrapped.forEach((l: string) => {
        y = addPageIfNeeded(doc, y, 6)
        doc.text(l, MARGIN, y)
        y += 6
      })
    } else if (line.startsWith('## ')) {
      const text = line.slice(3)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      y = addPageIfNeeded(doc, y, 10)
      y += 3
      const wrapped = doc.splitTextToSize(text, CONTENT_W) as string[]
      wrapped.forEach((l: string) => {
        y = addPageIfNeeded(doc, y, 7)
        doc.text(l, MARGIN, y)
        y += 7
      })
    } else if (line.startsWith('# ')) {
      const text = line.slice(2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      y = addPageIfNeeded(doc, y, 12)
      y += 4
      const wrapped = doc.splitTextToSize(text, CONTENT_W) as string[]
      wrapped.forEach((l: string) => {
        y = addPageIfNeeded(doc, y, 8)
        doc.text(l, MARGIN, y)
        y += 8
      })
    } else if (line.match(/^[-*] /)) {
      const text = '• ' + line.slice(2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const wrapped = doc.splitTextToSize(text, CONTENT_W - 4) as string[]
      wrapped.forEach((l: string, i: number) => {
        y = addPageIfNeeded(doc, y, 5)
        doc.text(l, i === 0 ? MARGIN : MARGIN + 4, y)
        y += 5
      })
    } else if (line.trim() === '') {
      y += 3
    } else {
      // Strip remaining markdown syntax (bold **, italic *, inline code `)
      const cleaned = line
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/^>\s*/, '')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const wrapped = doc.splitTextToSize(cleaned, CONTENT_W) as string[]
      wrapped.forEach((l: string) => {
        y = addPageIfNeeded(doc, y, 5)
        doc.text(l, MARGIN, y)
        y += 5
      })
    }
  }

  doc.save(`${title}.pdf`)
}

export function exportQuizAsPdf(
  title: string,
  source: string,
  questions: { question: string; options: string[] }[],
) {
  const LETTERS = 'ABCDEFGHIJ'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, title, [
    { label: 'Source', value: source },
    { label: 'Questions', value: String(questions.length) },
  ])

  questions.forEach((q, i) => {
    // Question number + text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const qPrefix = `${i + 1}. `
    const qText = q.question
    const prefixW = doc.getTextWidth(qPrefix)
    const qWrapped = doc.splitTextToSize(qText, CONTENT_W - prefixW) as string[]

    // Estimate block height to decide page break
    const blockHeight = (qWrapped.length * 5.5) + (q.options.length * 5) + 6
    y = addPageIfNeeded(doc, y, blockHeight)

    if (i > 0) y += 2

    qWrapped.forEach((l: string, li: number) => {
      doc.setFont('helvetica', 'bold')
      if (li === 0) {
        doc.text(qPrefix, MARGIN, y)
        doc.setFont('helvetica', 'bold')
        doc.text(l, MARGIN + prefixW, y)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.text(l, MARGIN + prefixW, y)
      }
      y += 5.5
    })

    // Options
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    q.options.forEach((opt, oi) => {
      const optPrefix = `   ${LETTERS[oi]})  `
      const optPrefixW = doc.getTextWidth(optPrefix)
      const optWrapped = doc.splitTextToSize(opt, CONTENT_W - optPrefixW) as string[]
      optWrapped.forEach((l: string, li: number) => {
        y = addPageIfNeeded(doc, y, 5)
        doc.text(li === 0 ? optPrefix : ' '.repeat(optPrefix.length), MARGIN, y)
        doc.text(l, MARGIN + optPrefixW, y)
        y += 5
      })
    })
  })

  doc.save(`${title}.pdf`)
}
