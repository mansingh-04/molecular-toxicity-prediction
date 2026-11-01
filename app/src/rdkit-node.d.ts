// The RDKit.js entry file used directly in Node scripts and tests (the browser loads it as a <script>).
declare module '@rdkit/rdkit/dist/RDKit_minimal.js' {
  const initRDKitModule: () => Promise<import('@rdkit/rdkit').RDKitModule>;
  export default initRDKitModule;
}
