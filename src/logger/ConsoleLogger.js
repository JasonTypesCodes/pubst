
export default class ConsoleLogger {

  warn(...messages) {
    messages.forEach(msg => {
      console.warn(`Pubst WARNING: ${msg}`);
    });
  }

}
