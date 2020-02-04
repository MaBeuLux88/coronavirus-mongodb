import datetime
import re
import sys
from html.parser import HTMLParser
from urllib.request import urlopen

from pymongo import MongoClient


class MyHTMLParser(HTMLParser):

    def __init__(self):
        super().__init__()
        self.tableCounter = 0
        self.readingTable = False
        self.readingTr = False
        self.readingTd = False
        self.readingHeaders = False
        self.headers = []
        self.sheets = []
        self.sheet = []
        self.currentObject = {}
        self.counterTdReading = 0

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
        if tag == 'td':
            self.readingTd = True

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
            elif data == 'First confirmed date in country (Est.)':
                self.headers.append('First confirmed date in country')
            elif '0' == data:
                pass
            else:
                self.headers.append(str.lower(data))
        if self.readingTd and not self.readingHeaders and not is_note and self.counterTdReading < len(self.headers):
            current_header = self.headers[self.counterTdReading]

            if current_header == 'state' and data == '0':
                pass
            elif current_header == 'country':
                if data == 'China':
                    data = 'Mainland China'
                elif data == 'United States':
                    data = 'US'
                self.currentObject[current_header] = data
                if data == 'Germany':
                    self.currentObject['state'] = 'Bavaria'
            elif current_header == 'date':
                # to iso date
                date = self.clean_date(data)
                # print(date)
                self.currentObject[current_header] = datetime.datetime.strptime(date, "%m/%d/%Y %H:%M")
            elif data.isdigit():
                data = int(data)
                self.currentObject[current_header] = data
            else:
                self.currentObject[current_header] = data
            self.counterTdReading += 1

    def clean_date(self, data):
        date_tab = data.split()
        date = date_tab[0].split('/')
        if date[2] == '20':
            date[2] = '2020'
        date = '/'.join(date)
        hour = '12:00'
        if len(date_tab) == 2:
            hour = ':'.join(date_tab[1].split(':')[0:2])
        if len(date_tab) == 3:
            if date_tab[2] == 'PM':
                hour_tab = date_tab[1].split(':')
                h = (int(hour_tab[0]) + 12) % 12
                m = hour_tab[1]
            else:
                hour_tab = date_tab[1].split(':')
                h = int(hour_tab[0]) % 12
                m = hour_tab[1]
            hour = str(h) + ':' + str(m)
        return date + ' ' + hour


class ImportMongoDB:
    def __init__(self):
        self.url1 = "https://docs.google.com/spreadsheets/d/1wQVypefm946ch4XDp37uZ-wartW4V7ILdg-qYiDXUHM/htmlview?sle=true"
        self.url2 = "https://docs.google.com/spreadsheets/d/1UF2pSkFTURko2OvfHWWlFpDFAr1UxCBA4JLwlSP6KFo/htmlview?usp=sharing&sle=true#"
        self.filename = "index.html"

    def main(self, argv):
        html1 = self.read_from_url(self.url1)
        html2 = self.read_from_url(self.url2)

        # self.write_to_file(html)
        # html = self.read_from_file()

        clean_html1 = self.html_cleaning(html1)
        clean_html2 = self.html_cleaning(html2)

        parser1 = MyHTMLParser()
        parser1.feed(clean_html1)

        parser2 = MyHTMLParser()
        parser2.feed(clean_html2)

        self.print_debug(parser2.sheets)

        self.add_geo_loc(parser1.sheets, parser2.sheets[0])

        self.write_to_mongodb(argv, parser1.sheets, 'coronavirus_maxime', 'statistics')
        self.write_to_mongodb(argv, parser2.sheets, 'coronavirus_maxime', 'time_series')

    def write_to_mongodb(self, argv, sheets, db, coll):
        client = MongoClient(argv[1])
        stats = client.get_database(db).get_collection(coll)
        stats.delete_many({})
        for sheet in sheets:
            stats.insert_many(sheet)
        client.close()

    def html_cleaning(self, html):
        return re.sub(r'<td( class="s.")?></td>', '<td>0</td>', html)

    def print_debug(self, sheets):
        for sheet in sheets:
            print(sheet[0])
            print(sheet[len(sheet) - 1])
            print()

    def write_to_file(self, html):
        file = open(self.filename, "w")
        file.write(html)
        file.close()

    def read_from_url(self, url):
        return urlopen(url).read().decode('utf-8')

    def read_from_file(self):
        file = open(self.filename, "r")
        html = file.read()
        file.close()
        return html

    def add_geo_loc(self, sheets, docs_with_loc):
        for docs in sheets:
            for doc in docs:
                state = doc.get('state')
                country = doc['country']
                for doc_with_loc in docs_with_loc:
                    if doc_with_loc['country'] == country:
                        if state is None or doc_with_loc['state'] == state:
                            doc['loc'] = {'type': 'Point',
                                          'coordinates': [float(doc_with_loc['long']), float(doc_with_loc['lat'])]}


ImportMongoDB().main(sys.argv)
