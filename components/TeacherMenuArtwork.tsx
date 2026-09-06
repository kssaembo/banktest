import React from 'react';

type ArtworkProps = {className?: string};
const artwork = (name: string): React.FC<ArtworkProps> => function MenuArtwork({className}) {
  // Menu text supplies the accessible name; the artwork is decorative.
  return <img src={'/design/teacher-tabs/teacher-'+name+'.png'} alt="" aria-hidden="true" draggable={false} className={className} style={{objectFit:'contain',flexShrink:0}}/>;
};
export const TeacherDashboardArtwork = artwork('dashboard');
export const TeacherStudentsArtwork = artwork('students');
export const TeacherJobsArtwork = artwork('jobs');
export const TeacherTaxArtwork = artwork('tax');
export const TeacherFundsArtwork = artwork('funds');
export const TeacherDonationsArtwork = artwork('donations');
export const TeacherStocksArtwork = artwork('stocks');
export const TeacherSavingsArtwork = artwork('savings');
export const TeacherExchangeArtwork = artwork('exchange');
