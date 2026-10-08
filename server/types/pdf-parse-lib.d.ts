// The package entry (pdf-parse/index.js) runs a self-test that reads ./test/data/*.pdf when it is
// loaded without a CommonJS parent (e.g. from an ESM bundle), so the library file is imported directly.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse';
  export default pdfParse;
}
