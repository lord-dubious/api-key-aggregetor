import React from "react";
import { ApiKeyStatus } from "src/types/ApiKeyStatus";
import TimestampDisplay from "../TimestampDisplay";
import RateInfo from "../RateInfo";

import style from "./style.module.css";

// create component via class
class KeyComponent extends React.Component<{
  keyData: ApiKeyStatus;
  status: string;
  proxies: string[];
  onProxyChange: (keyId: string, proxy: string) => void;
}> {
  render() {
    const { keyData, status, proxies, onProxyChange } = this.props;
    return (
      <tr className={status == "pending" ? style.scanner : ""}>
        <td>{keyData.keyId}</td>
        <td>
          <code>{"*".repeat(Math.max(0, keyData.key.length - 4)) + keyData.key.slice(-4)}</code>
        </td>
        <td>
          <select
            value={keyData.proxy || ""}
            onChange={(e) => onProxyChange(keyData.keyId, e.target.value)}
          >
            <option value="">No proxy</option>
            {proxies.map((proxy) => (
              <option key={proxy} value={proxy}>
                {proxy}
              </option>
            ))}
          </select>
        </td>
        <td>
          {keyData.usedHistory.length > 0 ? (
            <TimestampDisplay date={new Date(keyData.usedHistory[keyData.usedHistory.length - 1].date)} />
          ) : (
            "Never used"
          )}
        </td>
        <td>{keyData.status}</td>
        <td>
          <RateInfo keyData={keyData} />
        </td>
      </tr>
    );
  }
}

export class ApiKeysTable extends React.Component<{
  keys: ApiKeyStatus[];
  status: { [key: string]: string };
  proxies: string[];
  onProxyChange: (keyId: string, proxy: string) => void;
}> {
  render() {
    const { keys, status, proxies, onProxyChange } = this.props;

    return (
      <div>
        {keys.length > 0 ? (
          <table className={style.apiKeysTable}>
            <thead>
              <tr>
                <th>Key ID</th>
                <th>API Key</th>
                <th>Proxy</th>
                <th>Last Called</th>
                <th>Status</th>
                <th>Rate Limits</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((apiKey, i) => (
                <KeyComponent
                  key={i}
                  keyData={apiKey}
                  status={status[apiKey.keyId]}
                  proxies={proxies}
                  onProxyChange={onProxyChange}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p>No API keys available.</p>
        )}
      </div>
    );
  }
}
