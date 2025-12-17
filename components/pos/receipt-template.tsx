'use client'

import { CartItem } from '@/types'

interface ReceiptTemplateProps {
  saleNumber: string
  date: string
  items: CartItem[]
  subtotal: number
  discount: number
  discountPercent: number
  tax: number
  total: number
  paymentMethod: string
  cashReceived?: number
  change?: number
  customerName?: string
  cashierName?: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
  receiptFooter?: string
}

export function ReceiptTemplate({
  saleNumber,
  date,
  items,
  subtotal,
  discount,
  discountPercent,
  tax,
  total,
  paymentMethod,
  cashReceived,
  change,
  customerName,
  cashierName,
  storeName = 'CidPOS',
  storeAddress,
  storePhone,
  receiptFooter,
}: ReceiptTemplateProps) {
  // Generate a simple text-based barcode representation
  const generateBarcode = (text: string) => {
    // Simple representation - in production, you might want to use a barcode library
    return text.split('').map((char, i) => (i % 2 === 0 ? '█' : '░')).join('')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide receipt on screen */
          #receipt-print-area {
            display: none !important;
          }
          
          /* Print styles - hide everything except receipt */
          @media print {
            /* Hide all body content */
            body > * {
              display: none !important;
            }
            
            /* Show only the receipt */
            body #receipt-print-area {
              display: block !important;
              visibility: visible !important;
            }
            
            /* Reset body styles for print */
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            
            /* Receipt container */
            #receipt-print-area {
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              padding: 8mm 5mm;
              font-family: 'Inter', 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
              background: white;
              color: black;
              box-sizing: border-box;
            }
            
            /* Page setup for thermal printers */
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            /* Prevent page breaks */
            * {
              page-break-inside: avoid;
            }
          }
        `
      }} />
      <div 
        id="receipt-print-area" 
        className="receipt-container"
        style={{
          display: 'none',
          width: '80mm',
          maxWidth: '80mm',
          margin: '0 auto',
          padding: '8mm 5mm',
          fontFamily: "'Inter', 'Courier New', monospace",
          fontSize: '11px',
          lineHeight: 1.3,
          background: 'white',
          color: 'black',
          boxSizing: 'border-box',
        }}
      >
        {/* Store Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h2 style={{ 
            fontWeight: 'bold', 
            fontSize: '16px', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {storeName}
          </h2>
          {storeAddress && (
            <p style={{ fontSize: '10px', marginBottom: '2px', lineHeight: 1.4 }}>
              {storeAddress}
            </p>
          )}
          {storePhone && (
            <p style={{ fontSize: '10px', marginBottom: '4px' }}>
              Tel: {storePhone}
            </p>
          )}
          <div style={{ 
            borderTop: '1px dashed #000', 
            margin: '8px 0',
            height: '1px',
          }}></div>
        </div>

        {/* Sale Meta Info */}
        <div style={{ marginBottom: '10px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontWeight: '500' }}>Invoice #:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{saleNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Date:</span>
            <span>{date}</span>
          </div>
          {cashierName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Cashier:</span>
              <span>{cashierName}</span>
            </div>
          )}
          {customerName && customerName !== 'Walk-in Customer' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Customer:</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>

        <div style={{ 
          borderTop: '1px dashed #000', 
          margin: '8px 0',
          height: '1px',
        }}></div>

        {/* Items Table */}
        <div style={{ marginBottom: '10px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '10px',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: '600' }}>Item</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: '600' }}>Qty</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: '600' }}>Price</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: '600' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.productId || index} style={{ borderBottom: index < items.length - 1 ? '1px dotted #ccc' : 'none' }}>
                  <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: '500' }}>{item.productName}</div>
                    {item.barcode && (
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                        {item.barcode}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 4px 4px 0', verticalAlign: 'top' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 4px 4px 0', verticalAlign: 'top', fontFamily: 'monospace' }}>
                    {item.unitPrice.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: '500' }}>
                    {(item.quantity * item.unitPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ 
          borderTop: '1px dashed #000', 
          margin: '8px 0',
          height: '1px',
        }}></div>

        {/* Totals Section */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Subtotal:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
              {subtotal.toLocaleString()} MMK
            </span>
          </div>
          {discount > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '4px',
              color: '#16a34a',
            }}>
              <span>
                Discount{discountPercent > 0 ? ` (${discountPercent}%)` : ''}:
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                -{discount.toLocaleString()} MMK
              </span>
            </div>
          )}
          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Tax:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                {tax.toLocaleString()} MMK
              </span>
            </div>
          )}
          <div style={{ 
            borderTop: '2px solid #000', 
            margin: '6px 0',
            paddingTop: '4px',
          }}></div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontWeight: 'bold', 
            fontSize: '14px',
            marginTop: '4px',
          }}>
            <span>TOTAL:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '16px' }}>
              {total.toLocaleString()} MMK
            </span>
          </div>
        </div>

        {/* Payment Info */}
        <div style={{ marginBottom: '10px', fontSize: '10px' }}>
          <div style={{ 
            borderTop: '1px dashed #000', 
            margin: '8px 0',
            height: '1px',
          }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontWeight: '500' }}>Payment Method:</span>
            <span style={{ textTransform: 'uppercase', fontWeight: '600' }}>{paymentMethod}</span>
          </div>
          {paymentMethod === 'CASH' && cashReceived !== undefined && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Cash Received:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                  {cashReceived.toLocaleString()} MMK
                </span>
              </div>
              {change !== undefined && change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Change:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                    {change.toLocaleString()} MMK
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ 
          borderTop: '1px dashed #000', 
          margin: '8px 0',
          height: '1px',
        }}></div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '12px' }}>
          {receiptFooter ? (
            <p style={{ marginBottom: '6px', lineHeight: 1.4 }}>{receiptFooter}</p>
          ) : (
            <p style={{ marginBottom: '6px', fontWeight: '500' }}>Thank you for your purchase!</p>
          )}
          <p style={{ color: '#666', marginBottom: '8px' }}>Have a nice day!</p>
          
          {/* Barcode representation */}
          <div style={{ 
            marginTop: '10px',
            padding: '6px',
            border: '1px solid #000',
            display: 'inline-block',
            fontFamily: 'monospace',
            fontSize: '8px',
            letterSpacing: '1px',
          }}>
            {generateBarcode(saleNumber)}
          </div>
          <div style={{ 
            marginTop: '4px',
            fontSize: '9px',
            fontFamily: 'monospace',
            fontWeight: '500',
          }}>
            {saleNumber}
          </div>
        </div>
      </div>
    </>
  )
}
