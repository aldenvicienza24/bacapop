'use client';
import styles from '../admin.module.css';
export function ConfirmButton({label='Hapus',message,onConfirm,className=''}){return <button type="button" className={`${styles.button} ${styles.danger} ${className}`} onClick={()=>window.confirm(message)&&onConfirm()}>{label}</button>}
export function EmptyState({text}){return <div className={`${styles.card} ${styles.empty}`}><h2>Belum ada data</h2><p>{text}</p></div>}
export function Status({value}){return <span className={`${styles.status} ${styles[value]}`}>{value==='active'?'Aktif':'Nonaktif'}</span>}
