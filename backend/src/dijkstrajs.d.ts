// backend/src/dijkstrajs.d.ts
declare module 'dijkstrajs' {
    /** 
     * The default export is an object with a `find_path` method.
     * graph: { [node:string]: { [neighbor:string]: number } }
     */
    const dijkstra: {
      find_path: (graph: Record<string, Record<string, number>>, start: string, end: string) => string[];
    };
    export default dijkstra;
  }
  