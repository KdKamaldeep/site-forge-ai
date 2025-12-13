import styles from './ux-components.module.css';

export default function ComparisonTable({ headers, rows, ...props }) {
  return (
    <div className={styles.comparisonTableContainer} {...props}>
      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            {headers?.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

