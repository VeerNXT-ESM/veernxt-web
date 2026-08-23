import {
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  ImportantBlock,
  ExamTipBlock,
  DefinitionBlock,
  ExampleBlock,
  GenericCalloutBlock,
  ListBlock,
  NumberedListBlock,
  TableBlock,
  KeyFactsBlock,
  PullQuoteBlock,
  ExamAlertBlock,
  ComparisonTableBlock,
  StatStripBlock,
} from './BookBlocks';

// Single source of truth for turning one enriched-content block into its
// component — was previously duplicated between DevReader.jsx and
// BookReaderV2.jsx; both now import this instead.
export const BlockRenderer = ({ block }) => {
  switch (block.type) {
    case 'heading':         return <HeadingBlock level={block.level} content={block.content} />;
    case 'paragraph':       return <ParagraphBlock content={block.content} />;
    case 'image':           return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} />;
    case 'important':       return <ImportantBlock content={block.content} />;
    case 'examTip':         return <ExamTipBlock content={block.content} />;
    case 'definition':      return <DefinitionBlock content={block.content} />;
    case 'example':         return <ExampleBlock content={block.content} />;
    case 'callout':         return <GenericCalloutBlock content={block.content} />;
    case 'list':            return <ListBlock items={block.items} />;
    case 'numberedList':    return <NumberedListBlock items={block.items} />;
    case 'table':           return <TableBlock rows={block.rows} />;
    case 'keyFacts':        return <KeyFactsBlock title={block.title} items={block.items} />;
    case 'pullQuote':       return <PullQuoteBlock content={block.content} />;
    case 'examAlert':       return <ExamAlertBlock items={block.items} />;
    case 'comparisonTable': return <ComparisonTableBlock headers={block.headers} rows={block.rows} />;
    case 'statStrip':       return <StatStripBlock stats={block.stats} />;
    default:                return null;
  }
};
