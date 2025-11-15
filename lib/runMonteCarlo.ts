export async function runMonteCarlo(inputData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/mcWorker.js', import.meta.url));

    worker.onmessage = (e) => {
      const { type, result, error } = e.data;

      if (type === 'done') {
        worker.terminate();
        resolve(result);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage({ type: 'run', payload: inputData });
  });
}
