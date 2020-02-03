from html.parser import HTMLParser
from urllib.request import urlopen


class MyHTMLParser(HTMLParser):
    tableCounter = 0
    readingTable = False
    readingTr = False
    readingTd = False
    readingHeaders = False
    headers = []
    sheets = []
    sheet = []
    currentObject = {}
    counterTdReading = 0

    def error(self, message):
        print('Ooh Ooooh...')

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.tableCounter += 1
            self.readingTable = True
            self.readingHeaders = True
            self.headers = []
            # print('==> Start reading table #', self.tableCounter)
        if tag == 'tr':
            self.readingTr = True
            # self.currentObject = {}
            # print('start TR')
        if tag == 'td':
            self.readingTd = True
            # print('start TD')

    def handle_endtag(self, tag):
        if tag == 'table':
            self.readingTable = False
            self.sheets.append(self.sheet)
            self.sheet = []
            print(self.headers)
            # print('===> Stop reading table #', self.tableCounter)
        if tag == 'tr':
            self.readingTr = False
            if len(self.headers) != 0:
                self.readingHeaders = False
            if len(self.currentObject) != 0:
                self.sheet.append(self.currentObject)
                self.currentObject = {}
            self.counterTdReading = 0
        if tag == 'td':
            self.readingTd = False

    def handle_data(self, data):
        is_note = 'Quick note' in data
        if self.readingTd and self.readingHeaders and not is_note:
            if 'State' in data:
                self.headers.append('state')
            elif 'Country' in data:
                self.headers.append('country')
            elif 'Date' in data or 'Update' in data:
                self.headers.append('date')
            elif '0' in data:
                pass
            else:
                self.headers.append(str.lower(data))
        # print('counterTdReading', self.counterTdReading)
        # print('len(self.headers)', len(self.headers))
        if self.readingTd and not self.readingHeaders and not is_note and self.counterTdReading < len(self.headers):
            current_header = self.headers[self.counterTdReading]

            if current_header == 'state' and data == '0':
                pass
            elif current_header == 'date':
                data = data  # todo ISODATE
                self.currentObject[current_header] = data
            elif data.isdigit():
                data = int(data)
                self.currentObject[current_header] = data
            else:
                self.currentObject[current_header] = data
            self.counterTdReading += 1


class ImportMongoDB:
    def __init__(self):
        self.true = "https://docs.google.com/spreadsheets/d/1wQVypefm946ch4XDp37uZ-wartW4V7ILdg-qYiDXUHM/htmlview?sle=true"
        self.filename = "index.html"

    def main(self):
        html = self.read_from_url()
        self.write_to_file(html)
        # html = self.read_from_file()

        parser = MyHTMLParser()
        parser.feed(html.replace('<td></td>', '<td>0</td>'))

        for sheet in parser.sheets:
            print(sheet[0])
            print(sheet[len(sheet) - 1])
            print()

    def write_to_file(self, html):
        file = open(self.filename, "w")
        file.write(html)
        file.close()

    def read_from_url(self):
        url = self.true
        return urlopen(url).read().decode('utf-8')

    def read_from_file(self):
        file = open(self.filename, "r")
        html = file.read()
        file.close()
        return html


test = ImportMongoDB()
test.main()
