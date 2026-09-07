declare module "occt-import-js" {
  type OcctImportOptions = {
    locateFile?: (path: string, scriptDirectory: string) => string;
  };

  type StepImportOptions = {
    linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
    linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
    linearDeflection?: number;
    angularDeflection?: number;
  };

  export type ImportedMesh = {
    name: string;
    color?: [number, number, number];
    attributes: {
      position: { array: number[] };
      normal?: { array: number[] };
    };
    index: { array: number[] };
  };

  type ImportedNode = {
    name: string;
    meshes: number[];
    children: ImportedNode[];
  };

  export type StepImportResult = {
    success: boolean;
    root: ImportedNode;
    meshes: ImportedMesh[];
  };

  export type OcctImporter = {
    ReadStepFile: (content: Uint8Array, options: StepImportOptions) => StepImportResult;
  };

  type OcctFactory = (options?: OcctImportOptions) => Promise<OcctImporter>;

  const occtImportJs: OcctFactory;
  export default occtImportJs;
}
