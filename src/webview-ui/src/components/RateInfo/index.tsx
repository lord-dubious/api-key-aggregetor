import React from 'react';
import { ApiKeyStatus } from 'src/types/ApiKeyStatus';

function Cell({color}: {color: string}) {
  return (
    <div style={{ display: "inline-block", height: "16px", width: "4px", marginLeft:"4px", borderRadius: "2px", backgroundColor: color}}></div>
  );
}

export default function RateInfo({ keyData }: { keyData: ApiKeyStatus }) {
  return (
    <div style={{width: "100%", height: "16px"}}>
      {Array.from({ length: 15 }).map((_, i) => (
        <Cell key={i} color={"green"} />
      ))}
    </div>
  );
}