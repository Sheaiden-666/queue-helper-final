import qrcode
from io import BytesIO
from fastapi import Response

def generate_qr_code(data: str) -> Response:
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    return Response(content=img_io.getvalue(), media_type="image/png")