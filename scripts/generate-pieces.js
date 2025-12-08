const fs = require('fs');
const path = require('path');

const MAPPINGS = {
  'PAWN.svg': 'Pawn',
  'Gemini_Generated_Image_40n0va40n0va40n0-removebg-preview (2).svg': 'Knight',
  'BishopNoBG.svg': 'Bishop',
  'CastleNOBG.svg': 'Rook',
  'QUEEN.svg': 'Queen',
  'King.svg': 'King'
};


const OUTPUT_DIR = path.join(process.cwd(), 'src/components/chess/pieces');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// create PieceProps.ts
const propsContent = `
export interface PieceProps {
  style?: React.CSSProperties;
  className?: string;
}
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'types.ts'), propsContent);

Object.entries(MAPPINGS).forEach(([fileName, componentName]) => {
  const filePath = path.join(process.cwd(), 'public', fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let svgContent = fs.readFileSync(filePath, 'utf-8');

  // Identify viewbox
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';

  // Extract inner content (remove svg tags)
  // We want to keep the <g> and <path> tags but replace colors
  let innerContent = svgContent
    .replace(/<\?xml.*?\?>/g, '')
    .replace(/<!DOCTYPE.*?>/g, '')
    .replace(/<svg.*?>/g, '')
    .replace(/<\/svg>/g, '');

  // NO COLOR REPLACEMENT - Preserving Original High-Fidelity Colors
  // We want the intricate 3D shading of the original files.
  // Find all unique hex colors
  // const hexMatches = innerContent.match(/#[0-9a-fA-F]{6}/g) || [];
  // const uniqueHex = [...new Set(hexMatches)]; // Deduplicate

  // Replace each color based on classification
  // uniqueHex.forEach((hex) => {
  //   const prop = getColorProp(hex);
  //   const replacement = `fill={${prop} || "${hex}"} stroke={stroke} strokeWidth={strokeWidth}`;

  //   // Replace both double and single quotes variants
  //   // Use a regex that matches the attribute to avoid replacing specific text data if any
  //   innerContent = innerContent.replace(
  //     new RegExp(`fill="${hex}"`, 'gi'),
  //     replacement
  //   );
  //   innerContent = innerContent.replace(
  //     new RegExp(`fill='${hex}'`, 'gi'),
  //     replacement
  //   );
  // });

  // Fix strict JSX issues
  // class -> className
  innerContent = innerContent.replace(/class=/g, 'className=');
  // stroke-width -> strokeWidth
  innerContent = innerContent.replace(/stroke-width=/g, 'strokeWidth=');
  // stroke-linecap -> strokeLinecap
  innerContent = innerContent.replace(/stroke-linecap=/g, 'strokeLinecap=');
  // stroke-linejoin -> strokeLinejoin
  innerContent = innerContent.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  // fill-rule -> fillRule
  innerContent = innerContent.replace(/fill-rule=/g, 'fillRule=');
  // clip-rule -> clipRule
  innerContent = innerContent.replace(/clip-rule=/g, 'clipRule=');

  // remove newlines between attributes to match regex better? No.
  // Just simple replacements should work for these standard SVGs.

  const componentContent = `import React from 'react';
import { PieceProps } from './types';

export const ${componentName}: React.FC<PieceProps> = ({ style, className }) => {
  return (
    <svg 
      viewBox="${viewBox}" 
      style={style} 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      ${innerContent}
    </svg>
  );
};
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, `${componentName}.tsx`), componentContent);
  console.log(`Generated ${componentName}.tsx`);
});
