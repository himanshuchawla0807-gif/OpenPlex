import {nativeAvailable,nativeCommand} from './agentSessions'
/** Folder authorization is separate from the harness that powers the chat. */
export function WorkspaceLocation({directory,projectId,disabled=false,folderLocked=false,onError}:{directory?:string;projectId:string;disabled?:boolean;folderLocked?:boolean;onError?:(message:string)=>void}){
 const choose=()=>{onError?.('');if(nativeAvailable())nativeCommand({action:'choose-directory',projectId});else onError?.('Choose a workspace folder from the OpenPlex Mac app.')}
 return <div className="workspace-location"><div className="workspace-location-row"><button type="button" disabled={disabled||folderLocked} onClick={choose}>{directory?'Change folder':'Choose workspace folder'} ↗</button><span className="workspace-location-path" title={directory}>{directory||'Select where this employee will work'}</span></div></div>
}
