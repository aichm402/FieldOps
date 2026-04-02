import { ParseResult, ParsedProject } from '../types';
import { extractText } from './extractText';
import { validateArm } from './validateArm';
import { extractMeta } from './extractMeta';
import { extractTreatments } from './extractTreatments';

/**
 * Main PDF parsing function.
 * Takes a PDF buffer and filename, returns structured project data or an error.
 */
export async function parsePdf(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const warnings: string[] = [];

  // Step 1: Extract text
  let fullText: string;
  try {
    const extracted = await extractText(buffer);
    fullText = extracted.fullText;

    if (fullText.trim().length < 50) {
      return {
        success: false,
        warnings: [],
        parseConfidence: 'low',
        error: 'EMPTY_PDF',
        message: 'The PDF contains no extractable text. It may be a scanned image.',
        filename,
      };
    }
  } catch (err) {
    return {
      success: false,
      warnings: [],
      parseConfidence: 'low',
      error: 'PDF_READ_ERROR',
      message: `Failed to read PDF: ${err instanceof Error ? err.message : 'Unknown error'}`,
      filename,
    };
  }

  // Step 2: Validate ARM format
  const validation = validateArm(fullText);
  if (!validation.isArm) {
    return {
      success: false,
      warnings: [],
      parseConfidence: 'low',
      error: 'NOT_ARM_FORMAT',
      message:
        'This PDF does not appear to be an ARM-generated file. Please upload an ARM spray plan or trial map.',
      filename,
    };
  }

  // Step 3: Extract metadata
  const meta = extractMeta(fullText);

  if (meta.title === 'Untitled Project') {
    warnings.push('Could not extract a title; using default');
  }
  if (meta.crop === 'Unknown') {
    warnings.push('Could not determine crop type');
  }

  // Step 4: Extract treatments
  const { treatments, warnings: treatmentWarnings } = extractTreatments(fullText);
  warnings.push(...treatmentWarnings);

  // Step 5: Build project
  const project: ParsedProject = {
    title: meta.title,
    trialId: meta.trialId,
    protocolId: meta.protocolId,
    crop: meta.crop,
    contacts: meta.contacts,
    objectives: meta.objectives,
    year: meta.year,
    location: meta.location,
    plotWidth: meta.plotWidth,
    plotLength: meta.plotLength,
    reps: meta.reps,
    designType: meta.designType,
    treatmentCount: treatments.length,
    treatments,
  };

  // Step 6: Determine confidence
  let parseConfidence: 'high' | 'medium' | 'low' = 'high';

  if (treatments.length === 0) {
    parseConfidence = 'low';
    warnings.push('No treatments extracted — manual review recommended');
  } else if (warnings.length > 0) {
    parseConfidence = 'medium';
  }

  // Check that key fields were found
  const missingFields: string[] = [];
  if (!meta.trialId && !meta.protocolId) missingFields.push('trial/protocol ID');
  if (!meta.year) missingFields.push('year');
  if (!meta.reps) missingFields.push('replications');

  if (missingFields.length > 0) {
    warnings.push(`Missing fields: ${missingFields.join(', ')}`);
    if (parseConfidence === 'high') parseConfidence = 'medium';
  }

  return {
    success: true,
    project,
    warnings,
    parseConfidence,
    filename,
  };
}
