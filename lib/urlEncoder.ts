export function encodeJobTitle(title: string): string {
  // Base encoding using encodeURIComponent
  // This handles space (%20), double quotes (%22), and percent sign (%25) correctly.
  let encoded = encodeURIComponent(title);

  // Manually replace characters that encodeURIComponent leaves as-is
  // but are required to be encoded by the bash script spec:
  // ! -> %21
  // ' -> %27
  // ( -> %28
  // ) -> %29
  // , -> %2C
  
  encoded = encoded.replace(/!/g, '%21')
                   .replace(/'/g, '%27')
                   .replace(/\(/g, '%28')
                   .replace(/\)/g, '%29')
                   .replace(/,/g, '%2C');

  return encoded;
}
