import React from "react";
import { ApiKeyStatus } from "src/types/ApiKeyStatus";
import TimestampDisplay from "../TimestampDisplay";
import RateInfo from "../RateInfo";

import style from "./style.module.css";

// create component via class
class KeyComponent extends React.Component<{
  keyData: ApiKeyStatus;
}> {
  render() {
    const { keyData } = this.props;
    return (
      <tr>
        <td>{keyData.keyId}</td>
        <td>
          <code>{"*".repeat(Math.max(0, keyData.apiKey.length - 4)) + keyData.apiKey.slice(-4)}</code>
        </td>
        <td>
          {keyData.usedHistory.length > 0 ? (
            <TimestampDisplay date={keyData.usedHistory[0].date} />
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
}> {
  render() {
    const { keys } = this.props;

    return (
      <div>
        {keys.length > 0 ? (
          <table className={style.apiKeysTable}>
            <thead>
              <tr>
                <th>Key ID</th>
                <th>API Key</th>
                <th>Last Called</th>
                <th>Call Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((apiKey, i) => (
                <KeyComponent key={i} keyData={apiKey} />
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
