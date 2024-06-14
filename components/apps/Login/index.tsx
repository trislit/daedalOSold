import type React from "react";
import { ConnectButton } from "thirdweb/react";
import { client } from "components/system/Thirdweb/thirdwebClient"; // Adjust the import path as needed
import { type ComponentProcessProps } from "components/system/Apps/RenderComponent";

const ThirdwebConnect: React.FC<ComponentProcessProps> = ({ id: _id }) => (
  <div style={{ padding: "20px" }}>
    <h1>Connect</h1>
    <ConnectButton
      appMetadata={{
        name: "Example App",
        url: "https://example.com",
      }}
      client={client}
    />
  </div>
);

export default ThirdwebConnect;
