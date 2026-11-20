export const Section = ({ label, count }: { label: string; count?: number | null }) => (
    <div className="section display">
        <span>{label}</span>
        {count === null || count === undefined ? null : (
            <span className="section__count">({count})</span>
        )}
    </div>
);
