import React, { useState } from "react";
import style from "./style.module.css";

interface ProxyManagerProps {
  proxies: string[];
  onProxiesChange: (proxies: string[]) => void;
}

export const ProxyManager: React.FC<ProxyManagerProps> = ({ proxies, onProxiesChange }) => {
  const [newProxy, setNewProxy] = useState("");

  const handleAddProxy = () => {
    if (newProxy && !proxies.includes(newProxy)) {
      onProxiesChange([...proxies, newProxy]);
      setNewProxy("");
    }
  };

  const handleDeleteProxy = (proxyToDelete: string) => {
    onProxiesChange(proxies.filter(proxy => proxy !== proxyToDelete));
  };

  return (
    <div className={style.proxyManager}>
      <h3>Proxy List</h3>
      <div className={style.proxyInput}>
        <input
          type="text"
          value={newProxy}
          onChange={(e) => setNewProxy(e.target.value)}
          placeholder="Add new proxy"
        />
        <button onClick={handleAddProxy}>Add</button>
      </div>
      <ul className={style.proxyList}>
        {proxies.map((proxy, index) => (
          <li key={index}>
            {proxy}
            <button onClick={() => handleDeleteProxy(proxy)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
