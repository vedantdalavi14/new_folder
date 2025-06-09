import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import P2P from "@/pages/p2p";
import UploadShare from "@/pages/upload-share";
import Room from "@/pages/room";
import NotFound from "@/pages/not-found";

function Router() {
  console.log('🧭 Router initialized - SnapShare Hybrid');
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/p2p" component={P2P} />
      <Route path="/upload-share" component={UploadShare} />
      <Route path="/room/:roomId" component={Room} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
