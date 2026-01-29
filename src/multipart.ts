export interface MultipartResult {
    fields: Record<string, string>;
    files: Array<{ fieldname: string; filename: string; data: Buffer; mimetype: string }>;
}

export function parseMultipart(buffer: Buffer, boundary: string): MultipartResult {
    const result: MultipartResult = { fields: {}, files: [] };
    const boundaryBuffer = Buffer.from("--" + boundary);
    const parts = [];
    
    // Find first boundary
    let start = buffer.indexOf(boundaryBuffer);
    if (start === -1) return result;
    start += boundaryBuffer.length;
    
    // Skip CRLF after first boundary
    if (buffer[start] === 13 && buffer[start+1] === 10) start += 2;
    
    while (true) {
        const nextBoundary = buffer.indexOf(boundaryBuffer, start);
        if (nextBoundary === -1) break;
        
        // Extract part
        // The part ends before nextBoundary. 
        // Also need to handle CRLF before boundary.
        let end = nextBoundary;
        if (buffer[end-2] === 13 && buffer[end-1] === 10) end -= 2;
        
        const partBuffer = buffer.subarray(start, end);
        parts.push(partBuffer);
        
        start = nextBoundary + boundaryBuffer.length;
        // Check for end of stream "--"
        if (buffer[start] === 45 && buffer[start+1] === 45) break;
        // Skip CRLF
        if (buffer[start] === 13 && buffer[start+1] === 10) start += 2;
    }

    for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        
        const headersRaw = part.subarray(0, headerEnd).toString();
        const body = part.subarray(headerEnd + 4);
        
        const disposition = headersRaw.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
        const contentType = headersRaw.match(/Content-Type: ([^\r\n]+)/i);
        
        if (disposition) {
            const name = disposition[1];
            const filename = disposition[2];
            
            if (filename) {
                result.files.push({
                    fieldname: name,
                    filename,
                    data: body,
                    mimetype: contentType ? contentType[1] : "application/octet-stream"
                });
            } else {
                result.fields[name] = body.toString();
            }
        }
    }
    
    return result;
}
