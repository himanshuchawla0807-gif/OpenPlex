import type {ITheme} from '@xterm/xterm'
import {resolvedAppearance} from './appearance'
/** Opaque backgrounds let OSC color queries report a real light/dark surface.
 * Complete ANSI palettes avoid vendor TUIs falling back to unthemed black cells. */
export function terminalTheme():ITheme {
 return resolvedAppearance()==='dark'?{
  background:'#24222a',foreground:'#eee5ec',cursor:'#d4b1ce',cursorAccent:'#24222a',selectionBackground:'#75547288',
  black:'#24222a',red:'#e89690',green:'#9dc59f',yellow:'#dbbd86',blue:'#99b8df',magenta:'#cfacd5',cyan:'#8bc6ca',white:'#e7dfe5',
  brightBlack:'#a598a5',brightRed:'#ffb0a8',brightGreen:'#b9ddb5',brightYellow:'#f1d49d',brightBlue:'#b2ceef',brightMagenta:'#e4c6e9',brightCyan:'#b0dfe0',brightWhite:'#fff4e8'
 }:{
  background:'#fbf8f0',foreground:'#493e4b',cursor:'#80617d',cursorAccent:'#fbf8f0',selectionBackground:'#cdb9ca88',
  black:'#403749',red:'#9e4947',green:'#42694b',yellow:'#856039',blue:'#386482',magenta:'#815c88',cyan:'#39737a',white:'#d4c9bd',
  brightBlack:'#74646d',brightRed:'#ad4d47',brightGreen:'#416b46',brightYellow:'#8f642b',brightBlue:'#315f8b',brightMagenta:'#82578f',brightCyan:'#2c727a',brightWhite:'#fff9ed'
 }
}
