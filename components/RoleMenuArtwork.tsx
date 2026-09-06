import React from 'react';
const artwork=(folder:string,name:string):React.FC<{className?:string}>=>(props)=><img src={'/design/'+folder+'/'+name+'.png'} alt="" aria-hidden="true" draggable={false} {...props} style={{objectFit:'contain',flexShrink:0}}/>;
export const StudentHomeArtwork=artwork('student-page','student-home');
export const StudentTransferArtwork=artwork('student-page','student-transfer');
export const StudentStockArtwork=artwork('student-page','student-stock');
export const StudentFundArtwork=artwork('student-page','student-fund');
export const StudentSavingsArtwork=artwork('student-page','student-savings');
export const MartCheckoutArtwork=artwork('mart-mode','mart-checkout');
export const MartProductsArtwork=artwork('mart-mode','manage-products-services');
export const MartTransferArtwork=artwork('mart-mode','manage-transfer');
export const MartDetailsArtwork=artwork('mart-mode','manage-details');
export function KeyboardArtwork(){return <span className="student-keyboard" aria-hidden="true"><i>ㄱ</i><i>ㄴ</i><i>ㄷ</i><i>ㄹ</i><i>ㅁ</i><i>ㅂ</i><i className="student-spacekey"/></span>}
