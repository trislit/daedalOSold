import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Base } from "@thirdweb-dev/chains";
import { type AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "components/pages/ErrorBoundary";
import Metadata from "components/pages/Metadata";
import StyledApp from "components/pages/StyledApp";
import { FileSystemProvider } from "contexts/fileSystem";
import { MenuProvider } from "contexts/menu";
import { ProcessProvider } from "contexts/process";
import { SessionProvider } from "contexts/session";
import { ViewportProvider } from "contexts/viewport";

const queryClient = new QueryClient();

const App = ({ Component, pageProps }: AppProps): React.ReactElement => {
  // eslint-disable-next-line no-console
  console.log("Rendering App with QueryClientProvider");
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_API_KEY}
        supportedChains={[Base]}
      >
        <ViewportProvider>
          <ProcessProvider>
            <FileSystemProvider>
              <SessionProvider>
                <ErrorBoundary>
                  <Metadata />
                  <StyledApp>
                    <MenuProvider>
                      <Component {...pageProps} />
                    </MenuProvider>
                  </StyledApp>
                </ErrorBoundary>
              </SessionProvider>
            </FileSystemProvider>
          </ProcessProvider>
        </ViewportProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
};

export default App;
