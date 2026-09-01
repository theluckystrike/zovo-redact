import type { DetectionFinding, FindingCategory } from './types';

interface PatternDefinition {
  category: FindingCategory;
  label: string;
  confidence: DetectionFinding['confidence'];
  pattern: RegExp;
  validate?: (value: string) => boolean;
}

const luhnValid = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let total = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
    double = !double;
  }
  return total % 10 === 0;
};

const validIpv4 = (value: string): boolean =>
  value.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255);

const PATTERNS: readonly PatternDefinition[] = [
  {
    category: 'private-key',
    label: 'Private key',
    confidence: 'high',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    category: 'api-key',
    label: 'OpenAI-style API key',
    confidence: 'high',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: 'api-key',
    label: 'AWS access key',
    confidence: 'high',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    category: 'token',
    label: 'GitHub token',
    confidence: 'high',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,255}\b/g,
  },
  {
    category: 'token',
    label: 'JSON web token',
    confidence: 'high',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    category: 'credential',
    label: 'Credential assignment',
    confidence: 'high',
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\s*[:=]\s*["']?[^\s,"'}]{8,}["']?/gi,
  },
  {
    category: 'email',
    label: 'Email address',
    confidence: 'medium',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    category: 'financial',
    label: 'Payment card number',
    confidence: 'high',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: luhnValid,
  },
  {
    category: 'phone',
    label: 'Phone number',
    confidence: 'medium',
    pattern: /(?<!\w)(?:\+?\d[\d ().-]{7,}\d)(?!\w)/g,
    validate: (value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    },
  },
  {
    category: 'ip-address',
    label: 'IP address',
    confidence: 'medium',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validate: validIpv4,
  },
];

function overlap(a: DetectionFinding, b: DetectionFinding): boolean {
  return a.start < b.end && b.start < a.end;
}

export function detectSensitiveText(text: string): DetectionFinding[] {
  const findings: DetectionFinding[] = [];
  for (const definition of PATTERNS) {
    definition.pattern.lastIndex = 0;
    for (const match of text.matchAll(definition.pattern)) {
      const value = match[0];
      const start = match.index ?? 0;
      if (!value || (definition.validate && !definition.validate(value))) continue;
      const candidate: DetectionFinding = {
        category: definition.category,
        label: definition.label,
        start,
        end: start + value.length,
        confidence: definition.confidence,
      };
      const covering = findings.find((finding) => overlap(finding, candidate));
      if (!covering) findings.push(candidate);
      else if (candidate.confidence === 'high' && covering.confidence !== 'high') {
        findings.splice(findings.indexOf(covering), 1, candidate);
      }
    }
  }
  return findings.sort((left, right) => left.start - right.start || right.end - left.end);
}

export function uniqueCategories(findings: readonly DetectionFinding[]): FindingCategory[] {
  return Array.from(new Set(findings.map((finding) => finding.category)));
}

export function redactSensitiveText(text: string, findings = detectSensitiveText(text)): string {
  let output = text;
  for (const finding of [...findings].sort((left, right) => right.start - left.start)) {
    const label = finding.category.toUpperCase().replace('-', ' ');
    output = `${output.slice(0, finding.start)}[REDACTED ${label}]${output.slice(finding.end)}`;
  }
  return output;
}
